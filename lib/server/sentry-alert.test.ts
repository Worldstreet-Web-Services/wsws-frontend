import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  formatTelegramMessage,
  parseSentryAlert,
  verifySentrySignature,
} from "@/lib/server/sentry-alert";

const SECRET = "a-client-secret";

function sign(body: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

describe("verifySentrySignature", () => {
  const body = JSON.stringify({ action: "triggered", data: { event: { title: "boom" } } });

  it("accepts a body signed with our client secret", () => {
    expect(verifySentrySignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a body that was altered after signing", () => {
    const signature = sign(body);
    const tampered = body.replace("boom", "different");
    expect(verifySentrySignature(tampered, signature, SECRET)).toBe(false);
  });

  it("rejects a signature made with someone else's secret", () => {
    expect(verifySentrySignature(body, sign(body, "not-our-secret"), SECRET)).toBe(false);
  });

  /**
   * The relay must never post on an unsigned request: the endpoint is public,
   * so without this anyone could push arbitrary text into the team's channel.
   */
  it("rejects a missing signature, and refuses to run without a secret", () => {
    expect(verifySentrySignature(body, null, SECRET)).toBe(false);
    expect(verifySentrySignature(body, sign(body), "")).toBe(false);
  });

  /**
   * timingSafeEqual throws when the buffers differ in length, which would turn
   * a short signature into a 500 instead of a clean rejection.
   */
  it("rejects a signature of the wrong length without throwing", () => {
    expect(() => verifySentrySignature(body, "abc123", SECRET)).not.toThrow();
    expect(verifySentrySignature(body, "abc123", SECRET)).toBe(false);
  });
});

describe("parseSentryAlert", () => {
  it("reads an event_alert payload", () => {
    const alert = parseSentryAlert({
      data: {
        event: {
          title: "TypeError: undefined is not a function",
          level: "error",
          project_slug: "wsws-frontend",
          environment: "production",
          culprit: "apiFetch(lib/api)",
          web_url: "https://sentry.io/issues/1/",
        },
      },
    });
    expect(alert).toEqual({
      title: "TypeError: undefined is not a function",
      level: "error",
      project: "wsws-frontend",
      environment: "production",
      culprit: "apiFetch(lib/api)",
      url: "https://sentry.io/issues/1/",
    });
  });

  it("falls back through title, message and metadata for the headline", () => {
    expect(
      parseSentryAlert({ data: { issue: { message: "Circuit opened for kash" } } })?.title
    ).toBe("Circuit opened for kash");
    expect(
      parseSentryAlert({ data: { issue: { metadata: { value: "from metadata" } } } })?.title
    ).toBe("from metadata");
  });

  /**
   * Sentry sends resources we do not render — installation pings, comments. The
   * route drops those, so the parser has to say "nothing here" rather than
   * inventing an empty alert that would post a blank message.
   */
  it("returns null for a payload carrying no event, error or issue", () => {
    expect(parseSentryAlert({ action: "created" })).toBeNull();
    expect(parseSentryAlert({ data: {} })).toBeNull();
  });
});

describe("formatTelegramMessage", () => {
  const base = {
    title: "Boom",
    level: "error",
    project: "wsws-frontend",
    environment: "production",
    culprit: null,
    url: null,
  };

  /**
   * An error message can contain anything a user typed. Unescaped angle
   * brackets make Telegram reject the whole message as malformed HTML, which
   * would lose the alert silently — the one failure mode this relay must not
   * have.
   */
  it("escapes markup in untrusted error text", () => {
    const message = formatTelegramMessage({
      ...base,
      title: '<script>alert("x")</script> & <b>bold</b>',
    });
    expect(message).toContain("&lt;script&gt;");
    expect(message).toContain("&amp;");
    expect(message).not.toContain("<script>");
  });

  it("marks the level and names the project and environment", () => {
    const message = formatTelegramMessage(base);
    expect(message).toContain("🔴");
    expect(message).toContain("wsws-frontend");
    expect(message).toContain("production");
  });

  it("links to Sentry only when the payload carried a url", () => {
    expect(formatTelegramMessage(base)).not.toContain("Open in Sentry");
    expect(formatTelegramMessage({ ...base, url: "https://sentry.io/issues/1/" })).toContain(
      '<a href="https://sentry.io/issues/1/">Open in Sentry</a>'
    );
  });

  /** Telegram hard-rejects a message over 4096 characters. */
  it("clamps a runaway title instead of losing the message", () => {
    const message = formatTelegramMessage({ ...base, title: "x".repeat(5000) });
    expect(message.length).toBeLessThan(1000);
    expect(message).toContain("…");
  });
});
