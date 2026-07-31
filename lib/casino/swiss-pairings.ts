// Manual swiss pairings, and the pairs an organizer wants the service to avoid.
//
// The service pairs each round itself with a bundled engine. When that engine
// is missing it refuses the round and asks for pairings instead, so an
// organizer needs a way to write them. Getting this wrong wastes a round for
// everyone in the tournament, so the input is checked here before it is sent.
//
// Pure: no React, no fetch.

// The service's own caps.
const MAX_PAIRING_LINES = 4000;
const MAX_FORBIDDEN_LINES = 1000;

export interface PairingLine {
  white: string;
  // Null on a bye line, which is written "player 1".
  black: string | null;
}

export interface PairingCheck {
  lines: PairingLine[];
  error: string | null;
  // Entrants left unpaired. The service marks them absent for the round, so the
  // organizer is told rather than finding out afterwards.
  unassigned: string[];
}

function nonEmptyLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

// Checks a block of manual pairings against the entrant list.
//
// `players` is the current entrants, used to reject a name that is not playing:
// a typo would otherwise be sent upstream and rejected there with less context.
export function checkPairings(text: string, players: string[]): PairingCheck {
  const lines = nonEmptyLines(text);
  const empty: PairingCheck = { lines: [], error: null, unassigned: [] };

  if (!lines.length) return { ...empty, error: "Write at least one pairing." };
  if (lines.length > MAX_PAIRING_LINES) {
    return { ...empty, error: `That is more than ${MAX_PAIRING_LINES} pairings.` };
  }

  const known = new Set(players);
  const seen = new Set<string>();
  const parsed: PairingLine[] = [];

  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length !== 2) {
      return { ...empty, error: `Write "white black", or "player 1" for a bye: ${line}` };
    }

    const [white, second] = parts;
    // "1" in the second position is the service's way of writing a bye.
    const black = second === "1" ? null : second;

    if (!known.has(white)) return { ...empty, error: `${white} isn't in this tournament.` };
    if (black !== null && !known.has(black)) {
      return { ...empty, error: `${black} isn't in this tournament.` };
    }
    if (black !== null && white === black) {
      return { ...empty, error: `${white} can't play themselves.` };
    }
    if (seen.has(white)) return { ...empty, error: `${white} is paired more than once.` };
    seen.add(white);
    if (black !== null) {
      if (seen.has(black)) return { ...empty, error: `${black} is paired more than once.` };
      seen.add(black);
    }

    parsed.push({ white, black });
  }

  return {
    lines: parsed,
    error: null,
    unassigned: players.filter((player) => !seen.has(player)),
  };
}

// Checks the "never pair these two" block an organizer sets when creating a
// tournament. Same line shape, but both names are always present and a player
// may appear in several pairs.
export function checkForbiddenPairings(text: string, players: string[] = []): string | null {
  const lines = nonEmptyLines(text);
  if (!lines.length) return null;
  if (lines.length > MAX_FORBIDDEN_LINES) {
    return `That is more than ${MAX_FORBIDDEN_LINES} pairs.`;
  }

  const known = new Set(players);
  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length !== 2) return `Write two names per line: ${line}`;
    if (parts[0] === parts[1]) return `${parts[0]} can't be forbidden from playing themselves.`;
    // The entrant list is empty at creation time, so names are only checked
    // when there is something to check them against.
    if (known.size) {
      for (const name of parts) {
        if (!known.has(name)) return `${name} isn't in this tournament.`;
      }
    }
  }
  return null;
}

// True when the service refused a round because it has no pairing engine and
// needs the organizer to supply pairings.
export function needsManualPairings(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null;
  if (err?.code !== "BAD_REQUEST") return false;
  return /pairing/i.test(err.message ?? "");
}
