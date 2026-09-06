"use client";

import type { SpaceSpot } from "@/features/discovery/types";

// Rooms for the "Join the Conversation" card. There are none to feature, so
// this hands the card nothing and the card keeps the room it is drawn with.
//
// A SpaceSpot needs four things: a room name, a headline, member avatars, and
// two links. Three candidate sources were read and each is missing at least
// two of them.
//
// 1. Market Square, the product's actual rooms surface. A stream there has a
//    host, a title, a viewer count and a speaker queue, which is what the
//    card's mic discs and its "Join Space" pill are drawing. It is switched
//    off: MARKET_SQUARE_HIDDEN in lib/market-square.ts is true, so the sidebar
//    entry and the dashboard's square blocks render nothing, and
//    NEXT_PUBLIC_MARKET_SQUARE_URL ships unset, which makes useSquareFeed
//    disable its query outright. Lighting this card off the square would also
//    open a third way in to a surface a reviewed change deliberately closed,
//    and that is a product call rather than an adapter's.
//
// 2. Live chess matches, from useChessLobby. Real and public: fetchLiveMatches
//    lists the games in progress and /casino/chess/watch?match=<id> is a real
//    destination. But a match is two seats and nothing else the card needs.
//    ChessPlayer is id, username, rating, country and wallet; there is no
//    picture anywhere in features/casino/lib/api/types.ts, and a match carries
//    neither a name nor a headline.
//
// 3. Chess arenas, from useArenaList. An arena does have a name and a
//    participant count, which makes it the closest thing here to a room. It
//    still has no headline, and ArenaSummary carries no participant identities
//    at all, so there is nothing to build a member scatter from short of a
//    detail fetch per arena.
//
// Avatars are where all three end. The only pictures on hand are the nine ARK
// mascots in lib/square/avatar-seed.ts, chosen by a hash of a person's
// identity. Seeding those off a match or a tournament id would put faces on a
// room for people who are not in it, and invented members are worse than none.
//
// The second pill settles the rest. Its label is "Play Chess", so actionHref
// only tells the truth for a chess room: the one room the square cannot supply
// and the one the chess service cannot describe.
//
// When the square ships, this file is the only one that has to change.

// The cap the card asks for, matching the sibling adapters.
const DEFAULT_LIMIT = 5;

// One identity for "no rooms", so every render and every caller gets the same
// array back and the card's ten second rotation is never restarted by a new
// reference. Frozen because it is shared: a caller that mutated it would empty
// the constant for everyone.
const NO_SPACES: readonly SpaceSpot[] = Object.freeze([]);

/**
 * Live rooms for the "Join the Conversation" card. Always empty for now.
 *
 * The signature matches the other three discovery adapters so the route wires
 * all four the same way and only this file changes when a source arrives.
 * Handed an empty array the card keeps its editorial room, which is the honest
 * state: the platform has no live room to point a reader at yet.
 */
export function useSpaceSpots(limit: number = DEFAULT_LIMIT): readonly SpaceSpot[] {
  // Accepted so the contract holds, and unread until there is a list to cap.
  void limit;
  return NO_SPACES;
}
