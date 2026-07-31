// Who the chess proxy says a request is from.
//
// The chess service does no token verification. It acts on the `player`,
// `creator` and `organizer` names it is handed, which makes our proxy the only
// thing between a browser and somebody else's game, and now somebody else's
// money. `POST /cashier/withdrawals` takes `{ player, amountUsdc, toAddress }`:
// a forged `player` there sends another user's balance to an address of the
// attacker's choosing.
//
// So money paths are held to a stricter rule than game paths. A move made under
// a merely claimed identity costs a game; a withdrawal made under one costs a
// balance. The logic is pure and framework-free so the rule can be tested
// without standing up a request.

import { swissNameFor } from "@/lib/casino/api/swiss-wire";

// Paths where the caller's identity has to be proven, not taken on trust.
//
// Every cashier route moves money outright. Match and swiss creation and entry
// are listed because they can lock a stake or an entry fee, and the proxy
// cannot tell a staked create from an unstaked one without reading the body,
// which `stakesMoney` below does.
const CASHIER_PREFIX = "cashier/";

// Body keys that mean this request will move money if it succeeds.
const STAKE_KEYS = ["stake_usdc", "stakeUsdc", "entryFeeUsdc", "entry_fee_usdc"] as const;

export function isCashierPath(path: string): boolean {
  return path.startsWith(CASHIER_PREFIX);
}

// True when the body carries a stake or entry fee above zero. A key present but
// empty, zero or unparseable is not a stake, so an ordinary free game is not
// forced down the strict path.
export function stakesMoney(body: unknown): boolean {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return false;
  const record = body as Record<string, unknown>;
  return STAKE_KEYS.some((key) => {
    const value = record[key];
    if (typeof value === "number") return Number.isFinite(value) && value > 0;
    if (typeof value !== "string") return false;
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) && parsed > 0;
  });
}

// Whether this request needs a wallet the server can prove, rather than one the
// client merely claims.
export function requiresProvenWallet(path: string, body: unknown): boolean {
  return isCashierPath(path) || stakesMoney(body);
}

// Parses a request body, returning null for anything that is not a JSON object.
// A non-object body carries no identity to rewrite.
export function parseBody(raw: string): Record<string, unknown> | null {
  try {
    const body = raw ? JSON.parse(raw) : {};
    if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

// The address the request names itself by, used only to fail with a clear
// message rather than passing an anonymous write upstream.
export function claimedWallet(body: Record<string, unknown> | null): string | null {
  if (!body) return null;
  const value = body.player ?? body.creator;
  return typeof value === "string" && value.length > 0 ? value : null;
}

// Whether the request says who is acting, by any of the names the contract
// uses. Matches speak in wallet addresses (`player`, `creator`); swiss speaks
// in name tokens (`organizer`, `name`) and never carries an address at all.
//
// Checking only the match names rejected every swiss write whenever the Privy
// identity token was cold, with a message about not having a wallet that had
// nothing to do with the real cause.
export function namesAnActor(body: Record<string, unknown> | null): boolean {
  if (!body) return false;
  if (claimedWallet(body)) return true;
  return ["organizer", "name"].some((key) => {
    const value = body[key];
    return typeof value === "string" && value.length > 0;
  });
}

// Stamps the acting identity onto a body.
//
// `creator` names whoever opens a game, `player` every action on one. Swiss
// speaks in name tokens instead: `organizer` for the person running it and
// `name` for an entrant. All four are overwritten from the verified wallet when
// there is one, so a caller cannot act as somebody else.
//
// Swiss names are only rewritten on money paths. A free tournament lets a
// player pick their own token, and rewriting it there would rename existing
// entrants out of their own tournaments.
export function withIdentity(
  raw: string,
  wallet: string | null,
  { rewriteSwissNames = false }: { rewriteSwissNames?: boolean } = {}
): string {
  const body = parseBody(raw);
  if (!body || !wallet) return raw;

  // A swiss body names people by token, not by address, so it must not have a
  // `player` address injected into it.
  const isSwissBody =
    !("player" in body) && !("creator" in body) && ("organizer" in body || "name" in body);

  if ("creator" in body) body.creator = wallet;
  if ("player" in body || (!("creator" in body) && !isSwissBody)) body.player = wallet;

  if (rewriteSwissNames) {
    const token = swissNameFor(wallet);
    if ("organizer" in body) body.organizer = token;
    if ("name" in body) body.name = token;
    // The service pays a swiss entry fee to this address, so it has to be the
    // one the session owns rather than one the browser named.
    if ("walletAddress" in body) body.walletAddress = wallet;
  }

  return JSON.stringify(body);
}
