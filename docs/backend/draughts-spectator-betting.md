# Backend request: spectator betting on draughts matches

**Service:** `apps/chess` (tsionark-monorepo)
**Module:** `src/modules/betting`
**Requested by:** frontend (WSWS)
**Status:** frontend UI is built and merged behind a flag; waiting on the service

## Summary

Spectator pari-mutuel betting works on chess matches. It does not work on
draughts (checkers) matches, because the betting module resolves a match
exclusively through the chess `matches` table. A draughts match id is answered
with `match not found`.

The frontend for draughts betting is finished and ships disabled. Once the
service accepts a draughts match id on the three betting endpoints, the
frontend turns on by flipping one constant. No other frontend work is needed.

## Why it fails today

`BettingService::place_bet` resolves the match through the crud layer:

```rust
// src/modules/betting/service.rs
let meta = self
    .crud
    .match_meta(req.match_id)
    .await?
    .ok_or_else(|| AppError::NotFound("match not found".into()))?;
```

and that query reads the chess table only:

```rust
// src/modules/betting/crud.rs:46
"SELECT status, result, white_player, black_player FROM matches WHERE id = $1"
```

Draughts games are stored in a separate table created by
`migrations/0010_draughts.sql`:

```sql
CREATE TABLE IF NOT EXISTS draughts_matches ( ... );
```

The market table also has no way to say which game a market belongs to:

```sql
-- migrations/0006_betting.sql
CREATE TABLE IF NOT EXISTS betting_markets (
    match_id         UUID PRIMARY KEY,
    status           TEXT NOT NULL DEFAULT 'open',
    rake_bps         INT  NOT NULL DEFAULT 500,
    winning_outcome  TEXT,
    void_reason      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    settled_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS betting_bets (
    id        UUID PRIMARY KEY,
    match_id  UUID NOT NULL REFERENCES betting_markets (match_id),
    ...
);
```

So there are two problems: the match cannot be found, and even if it could, a
market row could not record which game it priced.

## There is already a precedent in this codebase

Swiss tournaments solved exactly this problem when draughts was added. That
approach works and is the one we suggest copying, so the two modules stay
consistent.

`swiss_tournaments` carries a game discriminator, and `swiss_pairings` carries
one nullable match id per game:

```rust
// src/modules/swiss/model.rs
pub game_kind: String,              // "chess" | "draughts"
pub match_id: Option<Uuid>,         // chess board
pub draughts_match_id: Option<Uuid> // draughts board
```

`SwissGameKind` (`src/modules/swiss/status.rs`) is the enum, and
`swiss/crud.rs` branches on it when reading back a finished board. The betting
module needs the same shape.

## What we are asking for

### 1. Schema

Add a game discriminator to the market, defaulting to `chess` so every existing
row and every existing bet keeps working untouched:

```sql
ALTER TABLE betting_markets
    ADD COLUMN game_kind TEXT NOT NULL DEFAULT 'chess';
```

`betting_bets` needs no change: it references `betting_markets (match_id)`, and
match ids are UUIDs that do not collide across the two tables.

Please confirm whether a match id is globally unique across `matches` and
`draughts_matches`. Both are UUID primary keys generated independently, so a
collision is not realistically possible, but if you would rather not rely on
that, make the market key composite instead:

```sql
ALTER TABLE betting_markets DROP CONSTRAINT betting_markets_pkey;
ALTER TABLE betting_markets ADD PRIMARY KEY (game_kind, match_id);
```

That is the safer option and we are happy either way. It does mean
`betting_bets` gains a `game_kind` column to match the composite foreign key.

### 2. Match resolution

`match_meta` should look in the table the game kind names. Something like:

```rust
pub async fn match_meta(
    &self,
    game: GameKind,
    match_id: Uuid,
) -> Result<Option<MatchMeta>, AppError> {
    let sql = match game {
        GameKind::Chess =>
            "SELECT status, result, white_player, black_player \
             FROM matches WHERE id = $1",
        GameKind::Draughts =>
            "SELECT status, result, white_player, black_player \
             FROM draughts_matches WHERE id = $1",
    };
    // ...
}
```

Both tables already expose `status`, `result`, `white_player` and
`black_player` with the same meanings, so `MatchMeta` does not change and none
of the downstream logic does either. In particular these keep working as-is:

- the "betting is only open while the match is live" check (`status = 'active'`)
- the integrity rule that a player may not bet on their own game
- settlement against `result` of `white` / `black` / `draw`

Draughts uses the same three outcomes as chess, so `BetOutcome` needs no
change.

### 3. Request/response contract

Add an optional `game` field to the place-bet request, defaulting to `chess`
so existing clients are unaffected:

```rust
pub struct PlaceBetRequest {
    pub match_id: Uuid,
    pub bettor: String,
    pub outcome: String,
    pub stake_usdc: String,
    #[serde(default)]
    pub game: Option<GameKind>, // "chess" (default) | "draughts"
}
```

For the two read endpoints, a query parameter is fine:

```
GET /betting/markets/{matchId}/odds?game=draughts
GET /betting/markets/{matchId}/bets?game=draughts&bettor=0x...
```

If you would rather infer the game by looking the id up in both tables and
skip the parameter entirely, that also works for us and is arguably nicer for
clients. We have no preference; we will follow whichever you pick. Please just
tell us which, since it changes what we send.

It would help if the odds and bet responses echoed `game` back, the way
`SwissSummaryResponse` and `SwissPairingResponse` already echo theirs.

### 4. Settlement

Whatever currently drives chess market settlement when a match finishes needs
an equivalent trigger for draughts. The draughts service already writes a
terminal `status` and `result` on `draughts_matches`, and it already syncs
results into Swiss standings, so the hook point exists. The market should
settle on the same three outcomes and void on an aborted game, exactly as
chess does.

Please make sure a draughts match that is aborted or ends with no bets placed
voids or settles cleanly rather than leaving an open market behind.

## What the frontend has ready

Nothing on our side needs building. Specifically:

- `lib/casino/api/betting.ts` and `hooks/use-casino-betting.ts` are already
  game-agnostic; they take a match id and a bettor and nothing else.
- Betting requests route through the existing `/api/chess` proxy, because the
  betting routes live at the service root rather than under `/draughts`. The
  cashier works the same way, and staked draughts games already use it.
- `components/dashboard/casino/draughts/spectator-betting.tsx` renders the full
  market: the three outcomes with pari-mutuel prices and pool sizes, the
  implied win probability bar, the stake box with a projected return, the
  caller's open bets, and the cashier top-up entry point.
- It is gated by `DRAUGHTS_BETTING_ENABLED` in
  `lib/casino/draughts/betting-readiness.ts`, currently `false`. While it is
  false no betting request is issued at all, so there is no 404 traffic against
  the service today.

When the service is ready we flip that constant to `true`, plus send the `game`
field in whatever form you settle on. That is the entire integration.

## How to verify it works

A draughts match id that currently returns `match not found` should price a
market instead. Concretely:

1. Create a draughts match: `POST /draughts/matches`, then join it so it goes
   `active`.
2. `GET /betting/markets/{draughtsMatchId}/odds` should return an open market
   with three zeroed outcomes, not a 404.
3. `POST /betting/bets` from a third wallet should be accepted.
4. The same call from either seat should still be rejected with `FORBIDDEN`.
5. Finish the game; the market should settle and pay the winning pool.

## Open questions for the backend team

1. Composite primary key on `betting_markets`, or rely on UUID uniqueness
   across the two match tables?
2. Explicit `game` parameter, or infer the game by checking both tables?
3. Is there an existing settlement trigger we should hook draughts into, or
   does that need building?
