import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Turning a Sentry webhook into a Telegram message.
 *
 * Sentry has no Telegram integration, so an Internal Integration posts here and
 * this relays. Kept out of the route handler and free of Next types so the two
 * things worth testing — the signature check and the formatting of untrusted
 * text — can be tested directly.
 *
 * The message is built to be actionable on a phone without opening Sentry: what
 * broke, the exact file and line it broke on, the line of source itself, which
 * page the user was on, and which of our services was involved. The link is
 * there for the full trace, not for the basics.
 */

/** Header Sentry signs every webhook body with. */
export const SENTRY_SIGNATURE_HEADER = "sentry-hook-signature";
/** Header naming what the webhook is about: "event_alert", "issue", "error". */
export const SENTRY_RESOURCE_HEADER = "sentry-hook-resource";

/** Telegram hard-rejects anything over 4096 characters. Leave room to spare. */
const MAX_MESSAGE = 3800;

/**
 * Verifies the body actually came from our Sentry integration.
 *
 * The hash must be taken over the RAW body, byte for byte, before any JSON
 * parsing — re-serialising an object produces different bytes and the signature
 * will never match. Compared in constant time so a wrong signature cannot be
 * discovered one character at a time.
 */
export function verifySentrySignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const given = Buffer.from(signature, "utf8");
  const mine = Buffer.from(expected, "utf8");
  // timingSafeEqual throws on a length mismatch, which would itself leak the
  // expected length, so the lengths are compared first and plainly.
  if (given.length !== mine.length) return false;
  return timingSafeEqual(given, mine);
}

/** Where the error actually happened, from the most useful stack frame. */
export interface AlertFrame {
  file: string;
  func: string | null;
  line: number | null;
  /** The source line itself, when Sentry has the uploaded source context. */
  contextLine: string | null;
}

export interface SentryAlert {
  title: string;
  /** The exception class, e.g. "TypeError", when the payload carries one. */
  type: string | null;
  level: string;
  project: string;
  environment: string;
  release: string | null;
  culprit: string | null;
  frame: AlertFrame | null;
  /** The route the user was on, e.g. "/dashboard". */
  transaction: string | null;
  /** Which of our upstreams was involved, from the tags reportRequestFailure sets. */
  service: string | null;
  status: string | null;
  /** The HTTP method. A failed POST is a user action that did not happen. */
  method: string | null;
  /** The Privy DID, the only identity we send. */
  userId: string | null;
  browser: string | null;
  events: number | null;
  users: number | null;
  url: string | null;
}

type Dict = Record<string, unknown>;

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number") return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function dict(value: unknown): Dict | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Dict) : null;
}

/**
 * Sentry sends tags as an array of [key, value] pairs, not an object. Some
 * payloads use [{key, value}] instead, so both are folded into one lookup.
 */
function readTags(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!Array.isArray(raw)) {
    const asObject = dict(raw);
    if (asObject) {
      for (const [key, value] of Object.entries(asObject)) {
        const v = asString(value);
        if (v) out[key] = v;
      }
    }
    return out;
  }
  for (const entry of raw) {
    if (Array.isArray(entry) && entry.length >= 2) {
      const key = asString(entry[0]);
      const value = asString(entry[1]);
      if (key && value) out[key] = value;
      continue;
    }
    const obj = dict(entry);
    const key = obj && asString(obj.key);
    const value = obj && asString(obj.value);
    if (key && value) out[key] = value;
  }
  return out;
}

/**
 * The frame worth naming.
 *
 * Frames run oldest to newest, so the LAST one is where it threw. We prefer the
 * last frame marked in_app: the true last frame is usually inside React or the
 * fetch polyfill, which tells nobody anything, while the last frame of ours is
 * the line a developer can actually go and open.
 */
function topFrame(exception: unknown): AlertFrame | null {
  const values = dict(exception)?.values;
  if (!Array.isArray(values) || values.length === 0) return null;

  // The last exception in the chain is the one that surfaced.
  const last = dict(values[values.length - 1]);
  const frames = dict(last?.stacktrace)?.frames;
  if (!Array.isArray(frames) || frames.length === 0) return null;

  const inApp = frames.filter((frame) => dict(frame)?.in_app === true);
  const candidates = inApp.length > 0 ? inApp : frames;
  const chosen = dict(candidates[candidates.length - 1]);
  if (!chosen) return null;

  const file = asString(chosen.filename) ?? asString(chosen.abs_path) ?? asString(chosen.module);
  if (!file) return null;

  return {
    file,
    func: asString(chosen.function),
    line: asNumber(chosen.lineno),
    contextLine: asString(chosen.context_line),
  };
}

interface SentryWebhookBody {
  action?: string;
  data?: Dict;
}

/**
 * Pulls everything worth putting in a chat message out of a Sentry payload.
 *
 * The resources carry different shapes — an event_alert wraps a full event, an
 * issue wraps a summary — so whichever is present is used and missing fields
 * simply stay null. Anything unrecognised returns null so the route can
 * acknowledge and drop it rather than posting an empty message.
 */
export function parseSentryAlert(body: SentryWebhookBody): SentryAlert | null {
  const data = dict(body.data);
  const subject = dict(data?.event) ?? dict(data?.error) ?? dict(data?.issue);
  if (!subject) return null;

  const metadata = dict(subject.metadata) ?? {};
  const tags = readTags(subject.tags);
  const contexts = dict(subject.contexts) ?? {};
  const issue = dict(data?.issue);

  const title =
    asString(subject.title) ??
    asString(metadata.value) ??
    asString(subject.message) ??
    asString(metadata.title) ??
    "Unknown error";

  const projectFromObject = dict(subject.project);
  const browserContext = dict(contexts.browser);

  return {
    title,
    type: asString(metadata.type),
    level: asString(subject.level) ?? tags.level ?? "error",
    project:
      asString(subject.project_slug) ??
      asString(projectFromObject?.slug) ??
      asString(subject.project) ??
      "unknown",
    environment: asString(subject.environment) ?? tags.environment ?? "unknown",
    release: asString(subject.release) ?? tags.release,
    culprit: asString(subject.culprit),
    frame: topFrame(subject.exception),
    transaction: asString(subject.transaction) ?? tags.transaction,
    // Set by reportRequestFailure and reportCircuitOpen; absent on ordinary crashes.
    service: tags["api.service"] ?? null,
    status: tags["api.status"] ?? null,
    method: tags["api.method"] ?? null,
    userId: asString(dict(subject.user)?.id),
    browser: asString(browserContext?.name)
      ? `${asString(browserContext?.name)} ${asString(browserContext?.version) ?? ""}`.trim()
      : (tags.browser ?? null),
    events: asNumber(subject.count) ?? asNumber(issue?.count),
    users: asNumber(subject.userCount) ?? asNumber(issue?.userCount),
    // web_url is the link a human should follow; url is the API resource.
    url: asString(subject.web_url) ?? asString(subject.permalink) ?? asString(subject.url),
  };
}

/**
 * Escapes text for Telegram's HTML parse mode.
 *
 * Everything here is attacker-influenced: an error message can contain whatever
 * a user typed into a form. Unescaped, a stray "<" makes Telegram reject the
 * whole message, which would mean losing the alert entirely.
 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function clamp(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

const LEVEL_MARK: Record<string, string> = {
  fatal: "🔴",
  error: "🔴",
  warning: "🟠",
  info: "🔵",
  debug: "⚪️",
};

/**
 * Trims a build path down to something a developer recognises.
 *
 * Frames arrive as "app:///_next/static/chunks/…" or an absolute path from the
 * build machine. Neither is where the file lives in the repo, so everything up
 * to and including the project root is dropped.
 */
function shortenFile(file: string): string {
  const cleaned = file.replace(/^app:\/\/\//, "").replace(/^webpack-internal:\/{3}/, "");

  // The EARLIEST of these wins, not the last. A path like
  // features/portfolio/components/balance-card.tsx contains both "features/"
  // and "components/", and cutting at the inner one throws away the feature
  // name, which is most of what makes the path recognisable.
  let earliest = -1;
  for (const dir of ["features/", "components/", "app/", "lib/", "hooks/"]) {
    const at = cleaned.startsWith(dir) ? 0 : cleaned.indexOf(`/${dir}`) + 1;
    if (at > 0 || cleaned.startsWith(dir)) {
      if (earliest === -1 || at < earliest) earliest = at;
    }
  }
  return earliest === -1 ? cleaned : cleaned.slice(earliest);
}

/** The message body posted to the channel. */
export function formatTelegramMessage(alert: SentryAlert): string {
  const mark = LEVEL_MARK[alert.level] ?? "⚠️";
  const lines: string[] = [];

  // Headline: the level and environment, then what actually broke.
  lines.push(
    `${mark} <b>${escapeHtml(alert.level.toUpperCase())}</b> · ${escapeHtml(alert.environment)}`
  );
  const headline = alert.type ? `${alert.type}: ${alert.title}` : alert.title;
  lines.push(`<b>${escapeHtml(clamp(headline, 300))}</b>`);

  // Where. The frame is the most useful line in the whole message, so it comes
  // first; culprit is the fallback when there is no stack.
  if (alert.frame) {
    const where = alert.frame.line
      ? `${shortenFile(alert.frame.file)}:${alert.frame.line}`
      : shortenFile(alert.frame.file);
    const fn = alert.frame.func
      ? ` in <code>${escapeHtml(clamp(alert.frame.func, 80))}</code>`
      : "";
    lines.push(`\n📍 <code>${escapeHtml(clamp(where, 160))}</code>${fn}`);
    if (alert.frame.contextLine) {
      lines.push(`<pre>${escapeHtml(clamp(alert.frame.contextLine.trim(), 200))}</pre>`);
    }
  } else if (alert.culprit) {
    lines.push(`\n📍 <code>${escapeHtml(clamp(alert.culprit, 200))}</code>`);
  }

  // Context: the page, and which upstream was involved when we reported it.
  const context: string[] = [];
  if (alert.transaction)
    context.push(`🧭 <code>${escapeHtml(clamp(alert.transaction, 120))}</code>`);
  if (alert.service) {
    const call = alert.method ? `${alert.method} ` : "";
    context.push(
      `🏷 <code>${escapeHtml(call)}${escapeHtml(alert.service)}</code>${alert.status ? ` · status <code>${escapeHtml(alert.status)}</code>` : ""}`
    );
  }
  if (alert.userId) context.push(`👤 <code>${escapeHtml(clamp(alert.userId, 60))}</code>`);
  if (alert.browser) context.push(`🌐 ${escapeHtml(clamp(alert.browser, 60))}`);
  if (context.length > 0) lines.push(`\n${context.join("\n")}`);

  // Scale and build, so the reader knows if this is one user or everyone.
  const facts: string[] = [];
  if (alert.events !== null) facts.push(`${alert.events} event${alert.events === 1 ? "" : "s"}`);
  if (alert.users !== null) facts.push(`${alert.users} user${alert.users === 1 ? "" : "s"}`);
  if (alert.release) facts.push(`release <code>${escapeHtml(clamp(alert.release, 12))}</code>`);
  facts.push(`project ${escapeHtml(alert.project)}`);
  lines.push(`\n📈 ${facts.join(" · ")}`);

  if (alert.url) lines.push(`\n<a href="${escapeHtml(alert.url)}">Open in Sentry →</a>`);

  return clamp(lines.join("\n"), MAX_MESSAGE);
}
