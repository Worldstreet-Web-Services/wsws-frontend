import type { SectionId } from "@/lib/sections";

// The chains a user can hold an embedded wallet on. Matches the values
// getWalletAddress expects.
export type ChainType = "ethereum" | "solana";

// The typed result of understanding one spoken command. Gemini returns loose
// JSON; lib/voice/normalize turns it into this union so the rest of the app
// only ever sees WSWS types, never a raw model payload.
//
// Phase 1 wired navigate. Phase 2 adds the read actions (balance, wallet
// address, refresh). Money actions come later without reshaping the contract.
//
// "unsupported" is for commands the model understood but the app can't do by
// voice yet (send, buy, sell, swap, deposit): we tell the user it's coming
// rather than pretending we didn't understand. "unknown" is genuine
// non-understanding.
export type Intent =
  | { action: "navigate"; target: SectionId }
  | { action: "getBalance" }
  | { action: "getWalletAddress"; chain: ChainType }
  | { action: "refresh" }
  | { action: "unsupported"; what: string }
  | { action: "unknown"; transcript: string };

// Where a spoken navigation command can go. Every value is a SectionId, so the
// dispatcher can hand it straight to use-app-navigate, which already knows how
// to route each one (vault is a real page, the rest are dashboard sections).
export const NAV_TARGETS: readonly SectionId[] = [
  "portfolio",
  "trade",
  "markets",
  "rwa",
  "prediction",
  "vault",
];

export const CHAIN_TYPES: readonly ChainType[] = ["ethereum", "solana"];

export function isNavTarget(value: string): value is SectionId {
  return (NAV_TARGETS as readonly string[]).includes(value);
}

export function isChainType(value: string): value is ChainType {
  return (CHAIN_TYPES as readonly string[]).includes(value);
}
