import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { Market } from "@/features/prediction/lib/types";
import type { Prediction } from "@/lib/types";
import { usePredictionSpots } from "./markets";

// The prediction hook is stubbed rather than driven through React Query: this
// suite is about the mapping, the ordering and the clock, not about the fetch.
const useMarkets = vi.fn();
vi.mock("@/features/prediction/hooks/use-prediction-markets", () => ({
  useMarkets: () => useMarkets(),
}));

// The feed fallback and the group read are not stubbed at the hook, though.
// What each of them costs is part of the claim: the feed is a request only when
// the on-chain read came back with nothing, and the groups list is one request
// on the browse page's cache entry. The only way to prove either is to watch the
// transport, so these tests run the real queries against a real client and
// assert on what reaches `apiFetch`.
const apiFetch = vi.fn();
vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

const FEED_PATH = "/api/predictions";
const GROUPS_PATH = "/api/prediction/groups?status=Open";

/** A fixed wall clock, so every countdown in this file is exact. */
const NOW_MS = Date.UTC(2026, 8, 5, 12, 0, 0);
const NOW_SECONDS = NOW_MS / 1000;

const DAY = 86_400;
const HOUR = 3_600;
const MINUTE = 60;

function market(overrides: Partial<Market> = {}): Market {
  return {
    marketId: 1n,
    creator: "0xcreator",
    question: "Will it rain in Lagos tomorrow?",
    category: "Weather",
    imageUrl: "https://cdn.example/rain.png",
    description: null,
    rules: null,
    resolutionSource: null,
    status: "Open",
    outcome: "Unresolved",
    closeTime: NOW_SECONDS + DAY,
    feeBps: 100,
    priceYes: 500_000n,
    priceNo: 500_000n,
    rYes: 1_000_000n,
    rNo: 1_000_000n,
    totalLp: 1_000_000n,
    collateral: 1_000_000n,
    volumeUsdc: 1_000_000n,
    ...overrides,
  };
}

function prediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    tag: "Crypto",
    vol: "$1.2M vol",
    q: "Will BTC close above $100k this year?",
    yes: "62¢",
    no: "38¢",
    pct: 62,
    image: "https://cdn.example/btc.png",
    yesTokenId: "111",
    noTokenId: "222",
    conditionId: "0xcondition",
    ...overrides,
  };
}

/** The on-chain read, settled on these markets. */
function served(markets: Market[]) {
  useMarkets.mockReturnValue({ data: markets, isPending: false });
}

/** The on-chain read, still in flight. */
function loading() {
  useMarkets.mockReturnValue({ data: undefined, isPending: true });
}

/** The on-chain read, settled on a failure. */
function failed() {
  useMarkets.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: true,
    error: new Error("gateway"),
  });
}

/*
 * A raw group payload, as the gateway sends it, not a `MarketGroup`.
 *
 * These go through `normalizeGroups` on the way in, so the fixture has to be
 * the wire shape: unix-second numbers and unscaled integers rather than the
 * bigints the domain type carries.
 */
function groupOutcome(marketId: number, imageUrl: string | null) {
  return {
    memberId: `member-${marketId}`,
    marketId,
    label: `Outcome ${marketId}`,
    imageUrl,
    status: "Open",
    outcome: "Unresolved",
    priceYes: 500_000,
    normalizedYes: 500_000,
    volumeUsdc: 1_000_000,
    closeTime: NOW_SECONDS + DAY,
  };
}

function group(overrides: Record<string, unknown> = {}) {
  return {
    id: "ligue-1",
    slug: "ligue-1",
    title: "Ligue 1 title",
    category: "Sports",
    description: null,
    rules: null,
    resolutionSource: null,
    imageUrl: "https://cdn.example/ligue1.png",
    closeTime: NOW_SECONDS + DAY,
    status: "Open",
    volumeUsdc: 5_000_000,
    outcomes: [],
    ...overrides,
  };
}

// What each endpoint answers with on the next call. Held rather than queued: a
// query may fetch once or refetch, and every attempt within a test gets the
// same answer.
let feedResponse: { ok: boolean; body: unknown };
let groupsResponse: { ok: boolean; body: unknown };

/** Routes the one transport by path, so each read's cost can be counted. */
function serveTransport() {
  apiFetch.mockImplementation(async (path: unknown) => {
    const grouped = String(path).startsWith("/api/prediction/groups");
    const answer = grouped ? groupsResponse : feedResponse;
    return { ok: answer.ok, json: async () => answer.body };
  });
}

/** What `/api/predictions` answers with. */
function feedServes(predictions: Prediction[]) {
  feedResponse = { ok: true, body: { predictions } };
}

/** `/api/predictions`, refusing. */
function feedFails() {
  feedResponse = { ok: false, body: {} };
}

/** What the prediction gateway's group list answers with. */
function groupsServe(groups: unknown[]) {
  groupsResponse = { ok: true, body: { success: true, data: groups } };
}

/** The group list, refusing. */
function groupsFail() {
  groupsResponse = { ok: false, body: {} };
}

/** How many times a given endpoint was asked for. */
function callsTo(path: string): number {
  return apiFetch.mock.calls.filter((call) => String(call[0]) === path).length;
}

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client }, children);
}

/*
 * The hook's own countdown interval, counted separately from every other timer
 * in the test.
 *
 * `vi.getTimerCount()` used to answer this on its own, but the feed fallback
 * brings a real QueryClient into the suite and the client schedules timeouts of
 * its own. The claim being made is about the one second tick, so the tick is
 * what is counted: `setInterval` is the only scheduler the hook touches, and
 * React Query's garbage collection uses `setTimeout`.
 */
const runningIntervals = new Set<unknown>();

function countIntervals() {
  const start = globalThis.setInterval;
  const stop = globalThis.clearInterval;
  vi.spyOn(globalThis, "setInterval").mockImplementation(((...args: Parameters<typeof start>) => {
    const id = start(...args);
    runningIntervals.add(id);
    return id;
  }) as typeof start);
  vi.spyOn(globalThis, "clearInterval").mockImplementation(((id: Parameters<typeof stop>[0]) => {
    runningIntervals.delete(id);
    return stop(id);
  }) as typeof stop);
}

function mount(limit?: number) {
  return renderHook(
    () => (limit === undefined ? usePredictionSpots() : usePredictionSpots(limit)),
    {
      wrapper,
    }
  );
}

/** Lets the feed query resolve, without letting the countdown clock advance. */
async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe("usePredictionSpots", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MS);
    runningIntervals.clear();
    countIntervals();
    useMarkets.mockReset();
    loading();
    apiFetch.mockReset();
    feedServes([]);
    groupsServe([]);
    serveTransport();
    client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    client.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("on-chain markets", () => {
    it("maps a market into the shape the card takes", () => {
      served([
        market({
          marketId: 42n,
          question: "  Will Benny Hinn be at Healing Stream?  ",
          imageUrl: "https://cdn.example/hinn.png",
          closeTime: NOW_SECONDS + DAY + 2 * HOUR + 3 * MINUTE + 4,
        }),
      ]);

      const { result } = mount();

      expect(result.current).toEqual([
        {
          id: "42",
          question: "Will Benny Hinn be at Healing Stream?",
          countdown: "01:02:03:04",
          images: ["https://cdn.example/hinn.png"],
          href: "/prediction/42",
        },
      ]);
    });

    it("pads every field of the countdown", () => {
      served([market({ closeTime: NOW_SECONDS + 9 })]);

      const { result } = mount();

      expect(result.current[0].countdown).toBe("00:00:00:09");
    });

    it("prints a third digit rather than losing a day past 99", () => {
      served([market({ closeTime: NOW_SECONDS + 100 * DAY })]);

      const { result } = mount();

      expect(result.current[0].countdown).toBe("100:00:00:00");
    });

    it("features the market closing soonest first", () => {
      served([
        market({ marketId: 1n, closeTime: NOW_SECONDS + 3 * DAY }),
        market({ marketId: 2n, closeTime: NOW_SECONDS + HOUR }),
        market({ marketId: 3n, closeTime: NOW_SECONDS + DAY }),
      ]);

      const { result } = mount();

      expect(result.current.map((spot) => spot.id)).toEqual(["2", "3", "1"]);
    });

    it("breaks a tie on close time by volume", () => {
      served([
        market({ marketId: 1n, closeTime: NOW_SECONDS + HOUR, volumeUsdc: 5_000_000n }),
        market({ marketId: 2n, closeTime: NOW_SECONDS + HOUR, volumeUsdc: 9_000_000n }),
      ]);

      const { result } = mount();

      expect(result.current.map((spot) => spot.id)).toEqual(["2", "1"]);
    });

    it("takes five markets by default and honours an explicit limit", () => {
      served(
        Array.from({ length: 8 }, (_, i) =>
          market({ marketId: BigInt(i + 1), closeTime: NOW_SECONDS + (i + 1) * HOUR })
        )
      );

      expect(mount().result.current).toHaveLength(5);
      expect(mount(2).result.current.map((spot) => spot.id)).toEqual(["1", "2"]);
      expect(mount(0).result.current).toEqual([]);
    });

    it("gives a market with no deadline a null countdown, and ranks it last", () => {
      served([
        market({ marketId: 1n, closeTime: 0, volumeUsdc: 9_000_000n }),
        market({ marketId: 2n, closeTime: NOW_SECONDS + 5 * DAY }),
      ]);

      const { result } = mount();

      expect(result.current.map((spot) => [spot.id, spot.countdown])).toEqual([
        ["2", "05:00:00:00"],
        ["1", null],
      ]);
    });

    it("orders deadline-less markets by volume", () => {
      served([
        market({ marketId: 1n, closeTime: 0, volumeUsdc: 2_000_000n }),
        market({ marketId: 2n, closeTime: 0, volumeUsdc: 7_000_000n }),
      ]);

      const { result } = mount();

      expect(result.current.map((spot) => spot.id)).toEqual(["2", "1"]);
    });

    it("hands the card no images when the market has no artwork", () => {
      served([market({ imageUrl: null })]);

      const { result } = mount();

      expect(result.current[0].images).toEqual([]);
    });

    it("drops markets that cannot be traded or headlined", () => {
      served([
        market({ marketId: 1n, status: "Resolved" }),
        market({ marketId: 2n, status: "Closed" }),
        // Still Open in the read model, but the close time has passed: the
        // backend flips the status on its own schedule.
        market({ marketId: 3n, closeTime: NOW_SECONDS - HOUR }),
        market({ marketId: 4n, question: null }),
        market({ marketId: 5n, question: "   " }),
        market({ marketId: 6n }),
      ]);

      const { result } = mount();

      expect(result.current.map((spot) => spot.id)).toEqual(["6"]);
    });

    it("is empty while the markets load", () => {
      loading();

      const { result } = mount();

      expect(result.current).toEqual([]);
    });

    it("recuts the countdown as the clock runs", () => {
      served([market({ closeTime: NOW_SECONDS + 2 * MINUTE })]);

      const { result } = mount();
      expect(result.current[0].countdown).toBe("00:00:02:00");

      act(() => vi.advanceTimersByTime(1_000));
      expect(result.current[0].countdown).toBe("00:00:01:59");

      act(() => vi.advanceTimersByTime(59_000));
      expect(result.current[0].countdown).toBe("00:00:01:00");
    });

    it("drops a market once its deadline passes, and stops ticking", async () => {
      served([market({ marketId: 7n, closeTime: NOW_SECONDS + 2 })]);

      const { result } = mount();
      expect(result.current).toHaveLength(1);
      expect(runningIntervals.size).toBe(1);

      act(() => vi.advanceTimersByTime(2_000));
      // The row is empty, so it now asks the feed, which has nothing either.
      await settle();

      expect(result.current).toEqual([]);
      // Nothing left to count down, so the tick is cleared rather than left
      // firing against an empty row.
      expect(runningIntervals.size).toBe(0);
    });

    it("runs no timer when nothing has a deadline", () => {
      served([market({ closeTime: 0 })]);

      mount();

      expect(runningIntervals.size).toBe(0);
    });

    it("hands back the same array across re-renders while nothing changes", () => {
      served([market({ marketId: 1n, closeTime: 0 })]);

      const { result, rerender } = mount();
      const first = result.current;

      rerender();
      expect(result.current).toBe(first);

      // A fresh poll that returns an equal list is still a new array from React
      // Query. The spots must not churn behind it.
      served([market({ marketId: 1n, closeTime: 0 })]);
      rerender();
      expect(result.current).toBe(first);
    });

    it("holds the array steady while the clock ticks under a frozen countdown", () => {
      served([market({ marketId: 1n, closeTime: NOW_SECONDS + DAY })]);

      const { result } = mount();
      const first = result.current;

      // Half a second: the tick fires at one, so no string has changed yet.
      act(() => vi.advanceTimersByTime(500));
      expect(result.current).toBe(first);

      act(() => vi.advanceTimersByTime(500));
      expect(result.current).not.toBe(first);
      expect(result.current[0].countdown).toBe("00:23:59:59");
    });
  });

  /*
   * The collage is a pair of photos and a market carries one, so the second has
   * to be a real second picture of the same event or there is no second tile.
   * The only place the gateway holds one is the multi-outcome event a market can
   * be an outcome of.
   */
  describe("the event collage", () => {
    it("puts the event's banner behind a member market's own photo", async () => {
      served([market({ marketId: 7n, imageUrl: "https://cdn.example/psg.png" })]);
      groupsServe([
        group({
          imageUrl: "https://cdn.example/ligue1.png",
          outcomes: [groupOutcome(7, "https://cdn.example/psg.png")],
        }),
      ]);

      const { result } = mount();
      await settle();

      // Index 1 is the front tile. The market's own photo stays there, so
      // finding an event photo adds a tile behind it rather than moving it.
      expect(result.current[0].images).toEqual([
        "https://cdn.example/ligue1.png",
        "https://cdn.example/psg.png",
      ]);
    });

    it("falls back to a sibling outcome when the event has no banner of its own", async () => {
      served([market({ marketId: 7n, imageUrl: "https://cdn.example/psg.png" })]);
      groupsServe([
        group({
          imageUrl: null,
          outcomes: [
            groupOutcome(7, "https://cdn.example/psg.png"),
            groupOutcome(8, "https://cdn.example/marseille.png"),
          ],
        }),
      ]);

      const { result } = mount();
      await settle();

      // Still a picture of this event, taken from inside it.
      expect(result.current[0].images).toEqual([
        "https://cdn.example/marseille.png",
        "https://cdn.example/psg.png",
      ]);
    });

    it("gives a member market with no artwork the event banner alone", async () => {
      served([market({ marketId: 7n, imageUrl: null })]);
      groupsServe([
        group({
          imageUrl: "https://cdn.example/ligue1.png",
          outcomes: [groupOutcome(7, null)],
        }),
      ]);

      const { result } = mount();
      await settle();

      // One photo takes the single front tile. It is not drawn twice to make a
      // pair: the same picture offset and tilted reads as a rendering fault.
      expect(result.current[0].images).toEqual(["https://cdn.example/ligue1.png"]);
    });

    it("never draws the same photo twice", async () => {
      served([market({ marketId: 7n, imageUrl: "https://cdn.example/psg.png" })]);
      groupsServe([
        group({
          // Every picture this event holds is the one the market already has:
          // the banner was set from the outcome's own art, and the only sibling
          // repeats it.
          imageUrl: "https://cdn.example/psg.png",
          outcomes: [
            groupOutcome(7, "https://cdn.example/psg.png"),
            groupOutcome(8, "https://cdn.example/psg.png"),
          ],
        }),
      ]);

      const { result } = mount();
      await settle();

      expect(result.current[0].images).toEqual(["https://cdn.example/psg.png"]);
    });

    it("leaves a standalone market on its one photo, even while events exist", async () => {
      // The market the row features belongs to no event, and nothing on the
      // event next to it may be borrowed to fill its second tile: a pair of
      // photos reads as two views of one thing.
      served([market({ marketId: 99n, imageUrl: "https://cdn.example/rain.png" })]);
      groupsServe([group({ outcomes: [groupOutcome(7, "https://cdn.example/psg.png")] })]);

      const { result } = mount();
      await settle();

      expect(result.current[0].images).toEqual(["https://cdn.example/rain.png"]);
    });

    it("takes nothing from an event whose outcomes never landed", async () => {
      // What an interrupted event create leaves behind: a group row with no
      // members. There is no join to make, so the member keeps its one photo.
      served([market({ marketId: 7n, imageUrl: "https://cdn.example/psg.png" })]);
      groupsServe([group({ outcomes: [] })]);

      const { result } = mount();
      await settle();

      expect(result.current[0].images).toEqual(["https://cdn.example/psg.png"]);
    });

    it("keeps the row on single photos when the group read fails", async () => {
      served([market({ marketId: 7n, imageUrl: "https://cdn.example/psg.png" })]);
      groupsFail();

      const { result } = mount();
      await settle();

      expect(result.current[0].images).toEqual(["https://cdn.example/psg.png"]);
      expect(result.current[0].question).toBe("Will it rain in Lagos tomorrow?");
    });

    it("pairs every featured member of the same event, not just the first", async () => {
      served([
        market({ marketId: 7n, imageUrl: "https://cdn.example/psg.png" }),
        market({
          marketId: 8n,
          imageUrl: "https://cdn.example/marseille.png",
          closeTime: NOW_SECONDS + 2 * DAY,
        }),
      ]);
      groupsServe([
        group({
          imageUrl: "https://cdn.example/ligue1.png",
          outcomes: [
            groupOutcome(7, "https://cdn.example/psg.png"),
            groupOutcome(8, "https://cdn.example/marseille.png"),
          ],
        }),
      ]);

      const { result } = mount();
      await settle();

      expect(result.current.map((spot) => spot.images)).toEqual([
        ["https://cdn.example/ligue1.png", "https://cdn.example/psg.png"],
        ["https://cdn.example/ligue1.png", "https://cdn.example/marseille.png"],
      ]);
    });

    it("holds the spots steady once the event artwork has landed", async () => {
      served([market({ marketId: 7n, closeTime: 0 })]);
      groupsServe([group({ outcomes: [groupOutcome(7, "https://cdn.example/psg.png")] })]);

      const { result } = mount();
      await settle();
      const first = result.current;

      // A refetch hands back an equal list in a new array. The images must not
      // churn behind it, or the card's photos remount once a poll.
      await act(async () => {
        await client.refetchQueries({ queryKey: ["prediction", "groups"] });
      });
      expect(result.current).toBe(first);
    });
  });

  describe("the polymarket fallback", () => {
    it("features the feed when the gateway serves no open market", async () => {
      served([]);
      feedServes([
        prediction({
          q: "  Will BTC close above $100k this year?  ",
          conditionId: "0xbtc",
          image: "https://cdn.example/btc.png",
        }),
      ]);

      const { result } = mount();
      await settle();

      expect(result.current).toEqual([
        {
          id: "0xbtc",
          question: "Will BTC close above $100k this year?",
          countdown: null,
          images: ["https://cdn.example/btc.png"],
          href: "/prediction",
        },
      ]);
    });

    it("falls back when the on-chain read fails, not only when it is empty", async () => {
      failed();
      feedServes([prediction({ conditionId: "0xa" })]);

      const { result } = mount();
      await settle();

      expect(result.current.map((spot) => spot.id)).toEqual(["0xa"]);
    });

    it("falls back when every on-chain market is closed or unheadlined", async () => {
      served([market({ status: "Resolved" }), market({ marketId: 2n, question: "  " })]);
      feedServes([prediction({ conditionId: "0xa" })]);

      const { result } = mount();
      await settle();

      expect(result.current.map((spot) => spot.id)).toEqual(["0xa"]);
    });

    it("leaves every feed card without a deadline, and runs no timer for them", async () => {
      served([]);
      feedServes([prediction({ conditionId: "0xa" }), prediction({ conditionId: "0xb" })]);

      const { result } = mount();
      await settle();

      expect(result.current.map((spot) => spot.countdown)).toEqual([null, null]);
      expect(runningIntervals.size).toBe(0);
    });

    it("sends every feed card to the browse page, since no detail route resolves a condition id", async () => {
      served([]);
      feedServes([prediction({ conditionId: "0xa" }), prediction({ conditionId: "0xb" })]);

      const { result } = mount();
      await settle();

      expect(result.current.map((spot) => spot.href)).toEqual(["/prediction", "/prediction"]);
    });

    it("uses the question as the id when the feed carries no condition id", async () => {
      served([]);
      feedServes([
        prediction({ q: "Will the Fed cut in March?", conditionId: undefined }),
        prediction({ q: "Will Arsenal win the league?", conditionId: "   " }),
      ]);

      const { result } = mount();
      await settle();

      expect(result.current.map((spot) => spot.id)).toEqual([
        "Will the Fed cut in March?",
        "Will Arsenal win the league?",
      ]);
    });

    it("hands the card no images when the feed market has no artwork", async () => {
      served([]);
      feedServes([
        prediction({ conditionId: "0xa", image: null }),
        prediction({ conditionId: "0xb", image: undefined }),
      ]);

      const { result } = mount();
      await settle();

      expect(result.current.map((spot) => spot.images)).toEqual([[], []]);
    });

    it("drops a feed market with no question", async () => {
      served([]);
      feedServes([
        prediction({ q: "   ", conditionId: "0xblank" }),
        prediction({ q: "Will it snow in Abuja?", conditionId: "0xsnow" }),
      ]);

      const { result } = mount();
      await settle();

      expect(result.current.map((spot) => spot.id)).toEqual(["0xsnow"]);
    });

    it("keeps the feed's own order and never parses its formatted volume", async () => {
      // The feed arrives ranked by 24h volume. `vol` is a display string the
      // server already rounded, and one of these is empty, so any attempt to
      // rank on it here would either reorder the feed or produce a NaN. The
      // order out must be the order in, whatever `vol` says.
      served([]);
      feedServes([
        prediction({ conditionId: "0xa", vol: "" }),
        prediction({ conditionId: "0xb", vol: "$9.9M vol" }),
        prediction({ conditionId: "0xc", vol: "not money" }),
        prediction({ conditionId: "0xd", vol: "$120 vol" }),
      ]);

      const { result } = mount();
      await settle();

      expect(result.current.map((spot) => spot.id)).toEqual(["0xa", "0xb", "0xc", "0xd"]);
    });

    it("takes the head of the feed up to the limit", async () => {
      served([]);
      feedServes(
        Array.from({ length: 9 }, (_, i) => prediction({ conditionId: `0x${i}`, q: `Q${i}?` }))
      );

      expect((await mounted()).map((spot) => spot.id)).toEqual(["0x0", "0x1", "0x2", "0x3", "0x4"]);
      expect((await mounted(2)).map((spot) => spot.id)).toEqual(["0x0", "0x1"]);
    });

    it("hands back the same array when a poll returns an equal feed", async () => {
      served([]);
      feedServes([prediction({ conditionId: "0xa" })]);

      const { result, rerender } = mount();
      await settle();
      const first = result.current;

      rerender();
      expect(result.current).toBe(first);

      // A refetch produces a new array of new objects for the same markets.
      await act(async () => {
        await client.refetchQueries({ queryKey: ["predictions"] });
      });
      expect(result.current).toBe(first);
    });

    it("swaps back to the on-chain markets the moment the gateway has any", async () => {
      served([]);
      feedServes([prediction({ conditionId: "0xa" })]);

      const { result, rerender } = mount();
      await settle();
      expect(result.current.map((spot) => spot.id)).toEqual(["0xa"]);

      served([market({ marketId: 9n, closeTime: NOW_SECONDS + HOUR })]);
      rerender();

      expect(result.current.map((spot) => [spot.id, spot.countdown])).toEqual([
        ["9", "00:01:00:00"],
      ]);
    });

    it("catches the clock up before the second tick, not a stale hour later", async () => {
      // Ten minutes on the feed, where nothing counts down, so the held clock
      // never advanced. The market below closes in an hour and would read 1:10
      // if the row kept cutting against the clock it mounted with.
      served([]);
      feedServes([prediction({ conditionId: "0xa" })]);

      const { result, rerender } = mount();
      await settle();

      await act(async () => {
        vi.setSystemTime(NOW_MS + 10 * MINUTE * 1000);
      });
      served([market({ marketId: 9n, closeTime: NOW_SECONDS + 10 * MINUTE + HOUR })]);
      rerender();

      // The catch-up is scheduled rather than synchronous, so the render that
      // brings the market back still carries the stale clock. It is corrected on
      // the next turn of the loop, well inside the second the tick would take.
      await settle();
      expect(result.current[0].countdown).toBe("00:01:00:00");
    });

    it("shows nothing rather than a stale feed while the on-chain read is in flight", async () => {
      // The feed is already cached from an earlier visit. The row still waits
      // for the gateway rather than flashing feed questions and swapping them.
      client.setQueryData(["predictions"], [prediction({ conditionId: "0xa" })]);
      loading();

      const { result } = mount();
      await settle();

      expect(result.current).toEqual([]);
    });
  });

  describe("what the fallback costs", () => {
    it("does not ask for the feed while the on-chain read is in flight", async () => {
      loading();

      mount();
      await settle();

      expect(callsTo(FEED_PATH)).toBe(0);
    });

    it("does not ask for the feed when the gateway has markets", async () => {
      served([market({ marketId: 1n, closeTime: NOW_SECONDS + HOUR })]);

      mount();
      await settle();

      expect(callsTo(FEED_PATH)).toBe(0);
    });

    it("does not ask for the feed when the caller wants no spots at all", async () => {
      served([]);

      mount(0);
      await settle();

      expect(callsTo(FEED_PATH)).toBe(0);
    });

    it("asks for the feed exactly once when the gateway is empty", async () => {
      served([]);
      feedServes([prediction({ conditionId: "0xa" })]);

      const { rerender } = mount();
      await settle();
      rerender();
      await settle();

      expect(callsTo(FEED_PATH)).toBe(1);
    });

    it("shares one cache entry with the prediction feature's own read", async () => {
      served([]);
      feedServes([prediction({ conditionId: "0xa" })]);

      mount();
      await settle();

      // The key is `usePredictions`' key. A second key here would mean a second
      // request for the same feed the moment both surfaces were on screen.
      expect(client.getQueryData(["predictions"])).toHaveLength(1);
    });

    it("does not ask for the group list while the on-chain read is in flight", async () => {
      loading();

      mount();
      await settle();

      expect(callsTo(GROUPS_PATH)).toBe(0);
    });

    it("does not ask for the group list when the gateway has no markets", async () => {
      served([]);

      mount();
      await settle();

      expect(callsTo(GROUPS_PATH)).toBe(0);
    });

    it("does not ask for the group list on the polymarket fallback path", async () => {
      served([]);
      feedServes([prediction({ conditionId: "0xa" })]);

      const { result } = mount();
      await settle();

      // The row is on the feed, and a feed spot carries a condition id that no
      // group's member market id could ever match. The list would be fetched
      // and thrown away.
      expect(result.current.map((spot) => spot.id)).toEqual(["0xa"]);
      expect(callsTo(GROUPS_PATH)).toBe(0);
    });

    it("does not ask for the group list when the caller wants no spots at all", async () => {
      served([market({ marketId: 7n, closeTime: NOW_SECONDS + HOUR })]);

      mount(0);
      await settle();

      expect(callsTo(GROUPS_PATH)).toBe(0);
    });

    it("asks the gateway for the group list once, on the browse page's own key", async () => {
      served([market({ marketId: 7n, closeTime: NOW_SECONDS + HOUR })]);
      groupsServe([group({ outcomes: [groupOutcome(7, "https://cdn.example/psg.png")] })]);

      const { rerender } = mount();
      await settle();
      rerender();
      await settle();

      // One list read for the whole row, not one per card, and no poll behind
      // it. The key is the one `useGroups({ status: "Open" })` opens on the
      // prediction browse page, so whichever surface mounts first pays for both.
      expect(callsTo(GROUPS_PATH)).toBe(1);
      expect(client.getQueryData(["prediction", "groups", null, "Open"])).toHaveLength(1);
    });

    it("keeps the row empty rather than erroring when both sources fail", async () => {
      served([]);
      feedFails();

      const { result } = mount();
      await settle();

      expect(result.current).toEqual([]);
    });
  });
});

/** Mounts, lets the feed resolve, and returns the spots. */
async function mounted(limit?: number) {
  const { result } = mount(limit);
  await settle();
  return result.current;
}
