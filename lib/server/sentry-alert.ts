import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Turning a Sentry webhook into a Telegram message.
 *
 * Sentry has no Telegram integration, so an Internal Integration posts here and
 * this relays. Kept out of the route handler and free of Next types so the two
 * things worth testing — the signature check and the formatting of untrusted
 * text — can be tested directly.
 */

/** Header Sentry signs every webhook body with. */
export const SENTRY_SIGNATURE_HEADER = "sentry-hook-signature";
/** Header naming what the webhook is about: "event_alert", "issue", "error". */
export const SENTRY_RESOURCE_HEADER = "sentry-hook-resource";

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

export interface SentryAlert {
  title: string;
  level: string;
  project: string;
  environment: string;
  culprit: string | null;
  url: string | null;
}

interface SentryWebhookBody {
  action?: string;
  data?: {
    event?: Record<string, unknown>;
    issue?: Record<string, unknown>;
    error?: Record<string, unknown>;
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Pulls the few fields worth putting in a chat message out of a Sentry payload.
 *
 * The three resources carry different shapes — an event_alert wraps an event,
 * an issue wraps an issue — so whichever is present is used, and anything
 * unrecognised returns null so the route can acknowledge and drop it rather
 * than posting an empty message.
 */
export function parseSentryAlert(body: SentryWebhookBody): SentryAlert | null {
  const subject = body.data?.event ?? body.data?.error ?? body.data?.issue;
  if (!subject) return null;

  const title =
    asString(subject.title) ??
    asString(subject.message) ??
    asString((subject.metadata as Record<string, unknown> | undefined)?.value) ??
    "Unknown error";

  return {
    title,
    level: asString(subject.level) ?? "error",
    project: asString(subject.project_slug) ?? asString(subject.project) ?? "unknown",
    environment: asString(subject.environment) ?? "unknown",
    culprit: asString(subject.culprit),
    // web_url is the link a human should follow; url is the API resource.
    url: asString(subject.web_url) ?? asString(subject.url),
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

/** Telegram rejects anything over 4096 characters, so long titles are cut. */
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

/** The message body posted to the channel. */
export function formatTelegramMessage(alert: SentryAlert): string {
  const mark = LEVEL_MARK[alert.level] ?? "⚠️";
  const lines = [
    `${mark} <b>${escapeHtml(clamp(alert.title, 300))}</b>`,
    `<b>Project</b> ${escapeHtml(alert.project)} · <b>Env</b> ${escapeHtml(alert.environment)}`,
  ];
  if (alert.culprit) lines.push(`<b>Where</b> ${escapeHtml(clamp(alert.culprit, 200))}`);
  if (alert.url) lines.push(`<a href="${escapeHtml(alert.url)}">Open in Sentry</a>`);
  return lines.join("\n");
}
