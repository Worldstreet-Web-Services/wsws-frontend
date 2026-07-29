import { isChainType, isNavTarget, type Intent } from "@/lib/voice/intent";
import type { RawIntent } from "@/lib/voice/gemini";

// Turns Gemini's loose JSON into a typed Intent. This is the seam that keeps
// model output out of the app: anything that does not match a known action, or
// an action missing its required field, collapses to "unknown" so the client
// can tell the user what it heard rather than acting on a bad guess.
export function normalizeIntent(raw: RawIntent): Intent {
  switch (raw.action) {
    case "navigate":
      if (raw.target && isNavTarget(raw.target)) {
        return { action: "navigate", target: raw.target };
      }
      break;
    case "getBalance":
      return { action: "getBalance" };
    case "getWalletAddress":
      if (raw.chain && isChainType(raw.chain)) {
        return { action: "getWalletAddress", chain: raw.chain };
      }
      break;
    case "refresh":
      return { action: "refresh" };
    case "unsupported":
      return { action: "unsupported", what: raw.what?.trim() || "that" };
  }
  return { action: "unknown", transcript: raw.transcript?.trim() || "" };
}
