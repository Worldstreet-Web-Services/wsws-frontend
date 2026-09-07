import { NextResponse, type NextRequest } from "next/server";
import {
  SENTRY_SIGNATURE_HEADER,
  formatTelegramMessage,
  parseSentryAlert,
  verifySentrySignature,
} from "@/lib/server/sentry-alert";

/**
 * Where Sentry's Internal Integration posts, and where the Telegram channel is
 * fed from.
 *
 * Sentry has no first-party Telegram integration, so this is the relay: it
 * proves the request came from our integration, turns the payload into a
 * message, and hands it to the Bot API. The bot token never leaves the server,
 * which is the whole reason this is a route handler and not a client call.
 *
 * Node runtime, not edge: the signature check uses node:crypto.
 */
export const runtime = "nodejs";

const TELEGRAM_TIMEOUT_MS = 5_000;

async function sendToTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  // A hung Telegram call must not hold the function open until the platform
  // kills it; the alert is already recorded in Sentry either way.
  const abort = AbortSignal.timeout(TELEGRAM_TIMEOUT_MS);
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      // The Sentry link would otherwise unfurl into a preview card and bury
      // the next alert under it.
      link_preview_options: { is_disabled: true },
    }),
    signal: abort,
  });

  if (!response.ok) {
    // Logged rather than thrown: Sentry retries on a non-2xx, and retrying a
    // message Telegram has already rejected only duplicates the failure.
    console.error(
      "[sentry-alert] Telegram rejected the message",
      response.status,
      await response.text().catch(() => "")
    );
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.SENTRY_CLIENT_SECRET;
  if (!secret) {
    // Unconfigured, so nothing can be trusted. 503 rather than 500: this is a
    // deployment that has not been finished, not a fault in the request.
    return new NextResponse("alert relay not configured", { status: 503 });
  }

  // Read the body as text FIRST. The signature is over these exact bytes, and
  // req.json() would consume the stream and leave nothing to verify.
  const raw = await req.text();

  if (!verifySentrySignature(raw, req.headers.get(SENTRY_SIGNATURE_HEADER), secret)) {
    return new NextResponse("bad signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("malformed payload", { status: 400 });
  }

  const alert = parseSentryAlert(body as Parameters<typeof parseSentryAlert>[0]);
  // A resource we do not render (an installation ping, a comment) is accepted
  // and dropped. Answering anything but 2xx would make Sentry retry it.
  if (!alert) return NextResponse.json({ relayed: false });

  await sendToTelegram(formatTelegramMessage(alert));
  return NextResponse.json({ relayed: true });
}
