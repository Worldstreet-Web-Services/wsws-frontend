import { NextResponse, type NextRequest } from "next/server";
import { verifyRequest } from "@/lib/server/auth";
import { inferIntentFromAudio } from "@/lib/voice/gemini";
import { normalizeIntent } from "@/lib/voice/normalize";

// Understands one spoken command. The auth check gates use of our Vertex/Gemini
// credentials; the audio is sent to Gemini, which transcribes and maps it to an
// action, and we return a typed Intent the client can dispatch.
export async function POST(req: NextRequest) {
  console.log("[voice-api] request received");
  const claims = await verifyRequest(req);
  if (!claims) {
    console.warn("[voice-api] unauthorized (no valid Privy token)");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log("[voice-api] authed user:", claims.userId);

  if (!process.env.GOOGLE_VERTEX_PROJECT || !process.env.GOOGLE_VERTEX_LOCATION) {
    console.warn("[voice-api] Vertex env not set");
    return NextResponse.json({ error: "Voice is not configured" }, { status: 503 });
  }

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob)) {
    console.warn("[voice-api] missing audio blob");
    return NextResponse.json({ error: "Missing audio" }, { status: 400 });
  }
  console.log("[voice-api] audio bytes:", audio.size, "type:", audio.type);

  try {
    const buffer = Buffer.from(await audio.arrayBuffer());
    const raw = await inferIntentFromAudio(buffer, audio.type || "audio/webm");
    console.log("[voice-api] gemini raw:", JSON.stringify(raw));
    return NextResponse.json({ intent: normalizeIntent(raw) });
  } catch (error) {
    console.error("[voice-api] Gemini call failed:", error);
    return NextResponse.json({ error: "Could not understand that" }, { status: 502 });
  }
}
