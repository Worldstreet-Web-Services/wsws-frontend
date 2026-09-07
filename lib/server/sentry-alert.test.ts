import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  formatTelegramMessage,
  parseSentryAlert,
  verifySentrySignature,
  type SentryAlert,
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
    expect(verifySentrySignature(body.replace("boom", "different"), signature, SECRET)).toBe(false);
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
  /** A payload shaped the way Sentry sends an event_alert for a real crash. */
  const eventAlert = {
    data: {
      event: {
        title: "TypeError: Cannot read properties of undefined",
        level: "error",
        project_slug: "frontend-monitor",
        environment: "production",
        release: "299d295af0b0514399db5d74aa54608d21c87e31",
        culprit: "BalanceCard(features/portfolio)",
        transaction: "/dashboard",
        web_url: "https://tsion-n2.sentry.io/issues/1/",
        metadata: { type: "TypeError", value: "Cannot read properties of undefined" },
        user: { id: "did:privy:cm2xabc", ip_address: "1.2.3.4" },
        contexts: { browser: { name: "Chrome", version: "151.0.0" } },
        tags: [
          ["api.service", "portfolio"],
          ["api.status", "500"],
          ["api.method", "POST"],
        ],
        exception: {
          values: [
            {
              type: "TypeError",
              stacktrace: {
                frames: [
                  {
                    filename: "app:///_next/static/chunks/react-dom.js",
                    function: "renderWithHooks",
                    lineno: 4621,
                    in_app: false,
                  },
                  {
                    filename: "app:///features/portfolio/components/balance-card.tsx",
                    function: "BalanceCard",
                    lineno: 42,
                    colno: 19,
                    in_app: true,
                    context_line: "  const total = tokens.map((t) => t.valueUsd);",
                  },
                  {
                    filename: "app:///_next/static/chunks/scheduler.js",
                    function: "flushWork",
                    lineno: 12,
                    in_app: false,
                  },
                ],
              },
            },
          ],
        },
      },
    },
  };

  it("reads the headline, project, environment and link", () => {
    const alert = parseSentryAlert(eventAlert)!;
    expect(alert.type).toBe("TypeError");
    expect(alert.project).toBe("frontend-monitor");
    expect(alert.environment).toBe("production");
    expect(alert.url).toBe("https://tsion-n2.sentry.io/issues/1/");
    expect(alert.transaction).toBe("/dashboard");
  });

  /**
   * The whole point of the richer message. The last frame is inside the
   * scheduler, which tells nobody anything; the last IN-APP frame is the line a
   * developer can open.
   */
  it("picks the last in-app frame, not the last frame overall", () => {
    const alert = parseSentryAlert(eventAlert)!;
    expect(alert.frame).toEqual({
      file: "app:///features/portfolio/components/balance-card.tsx",
      func: "BalanceCard",
      line: 42,
      contextLine: "  const total = tokens.map((t) => t.valueUsd);",
    });
  });

  it("falls back to the last frame when nothing is marked in-app", () => {
    const alert = parseSentryAlert({
      data: {
        event: {
          title: "boom",
          exception: {
            values: [
              {
                stacktrace: {
                  frames: [
                    { filename: "a.js", function: "first", lineno: 1 },
                    { filename: "b.js", function: "last", lineno: 2 },
                  ],
                },
              },
            ],
          },
        },
      },
    })!;
    expect(alert.frame?.func).toBe("last");
  });

  /** Sentry sends tags as [key, value] pairs, but some payloads use objects. */
  it("reads tags in either the pair or the object form", () => {
    const fromPairs = parseSentryAlert(eventAlert)!;
    expect(fromPairs.service).toBe("portfolio");
    expect(fromPairs.status).toBe("500");
    expect(fromPairs.method).toBe("POST");

    const fromObjects = parseSentryAlert({
      data: {
        event: {
          title: "boom",
          tags: [
            { key: "api.service", value: "kash" },
            { key: "api.status", value: "network" },
          ],
        },
      },
    })!;
    expect(fromObjects.service).toBe("kash");
    expect(fromObjects.status).toBe("network");
  });

  it("carries the Privy id and the browser, and no other identity", () => {
    const alert = parseSentryAlert(eventAlert)!;
    expect(alert.userId).toBe("did:privy:cm2xabc");
    expect(alert.browser).toBe("Chrome 151.0.0");
  });

  it("reads an issue payload's counts", () => {
    const alert = parseSentryAlert({
      data: {
        issue: { title: "Circuit opened for kash", count: 12, userCount: 4, level: "error" },
      },
    })!;
    expect(alert.events).toBe(12);
    expect(alert.users).toBe(4);
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

  it("survives a payload with none of the optional parts", () => {
    const alert = parseSentryAlert({ data: { event: { title: "bare" } } })!;
    expect(alert.title).toBe("bare");
    expect(alert.frame).toBeNull();
    expect(alert.service).toBeNull();
    expect(alert.userId).toBeNull();
  });
});

describe("formatTelegramMessage", () => {
  const base: SentryAlert = {
    title: "Cannot read properties of undefined",
    type: "TypeError",
    level: "error",
    project: "frontend-monitor",
    environment: "production",
    release: "299d295af0b0514399db5d74aa54608d21c87e31",
    culprit: null,
    frame: {
      file: "app:///features/portfolio/components/balance-card.tsx",
      func: "BalanceCard",
      line: 42,
      contextLine: "  const total = tokens.map((t) => t.valueUsd);",
    },
    transaction: "/dashboard",
    service: "portfolio",
    status: "500",
    method: "POST",
    userId: "did:privy:cm2xabc",
    browser: "Chrome 151.0.0",
    events: 7,
    users: 3,
    url: "https://tsion-n2.sentry.io/issues/1/",
  };

  it("names the file, line and function so the reader can open it", () => {
    const message = formatTelegramMessage(base);
    expect(message).toContain("features/portfolio/components/balance-card.tsx:42");
    expect(message).toContain("BalanceCard");
    expect(message).toContain("tokens.map");
  });

  /** The build prefix is not where the file lives in the repo. */
  it("strips the app:/// build prefix from the path", () => {
    expect(formatTelegramMessage(base)).not.toContain("app:///");
  });

  it("carries the service, status, route, user and scale", () => {
    const message = formatTelegramMessage(base);
    expect(message).toContain("POST");
    expect(message).toContain("portfolio");
    expect(message).toContain("500");
    expect(message).toContain("/dashboard");
    expect(message).toContain("did:privy:cm2xabc");
    expect(message).toContain("7 events");
    expect(message).toContain("3 users");
  });

  /**
   * An error message can contain anything a user typed. Unescaped angle
   * brackets make Telegram reject the whole message as malformed HTML, which
   * would lose the alert silently — the one failure mode this relay must not
   * have.
   */
  it("escapes markup in untrusted error text and in source lines", () => {
    const message = formatTelegramMessage({
      ...base,
      title: '<script>alert("x")</script> & <b>bold</b>',
      frame: { ...base.frame!, contextLine: "if (a < b && c > d) return <div/>;" },
    });
    expect(message).toContain("&lt;script&gt;");
    expect(message).toContain("&amp;");
    expect(message).not.toContain("<script>");
    expect(message).not.toContain("<div/>");
  });

  it("falls back to the culprit when there is no stack frame", () => {
    const message = formatTelegramMessage({
      ...base,
      frame: null,
      culprit: "circuit-store(lib/api)",
    });
    expect(message).toContain("circuit-store(lib/api)");
  });

  it("omits every optional line rather than printing empty labels", () => {
    const message = formatTelegramMessage({
      ...base,
      frame: null,
      culprit: null,
      transaction: null,
      service: null,
      status: null,
      method: null,
      userId: null,
      browser: null,
      events: null,
      users: null,
      release: null,
      url: null,
    });
    expect(message).not.toContain("📍");
    expect(message).not.toContain("🧭");
    expect(message).not.toContain("👤");
    expect(message).not.toContain("Open in Sentry");
    expect(message).toContain("project frontend-monitor");
  });

  /** Telegram hard-rejects a message over 4096 characters. */
  it("keeps a runaway payload under Telegram's limit", () => {
    const message = formatTelegramMessage({
      ...base,
      title: "x".repeat(9000),
      frame: { ...base.frame!, contextLine: "y".repeat(9000) },
    });
    expect(message.length).toBeLessThanOrEqual(3800);
  });
});
