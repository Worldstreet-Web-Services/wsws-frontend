import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import enMessages from "@/messages/en.json";
import type { VaultActivity, VaultGame, VaultWinner } from "@/features/casino/lib/vault-api";

// The section is the one piece of the arcade that owns decisions rather than
// looks: which stage phase to draw, which rail cards can actually be pressed,
// and which strings each state gets. Every hook under it talks to a socket, a
// contract or a price feed, so they are all replaced here and the file asserts
// on the wiring alone.

const ls = enMessages.casino.lastStanding;
const ZERO = "0x0000000000000000000000000000000000000000";
const ME = "0x1111111111111111111111111111111111111111";
const THEM = "0x2222222222222222222222222222222222222222";
const STARTER = "0x3333333333333333333333333333333333333333";

// Mutable fixtures, reset per test. The mock factories below read through
// these, so a test sets the world and then renders.
let world: {
  address: string | null;
  game: VaultGame | null;
  loading: boolean;
  error: boolean;
  notFound: boolean;
  degraded: boolean;
  activities: VaultActivity[];
  winners: VaultWinner[];
  balanceUsd: number;
  pending: { token: string; raw: bigint; amount: { decimals: number } }[];
};

const settle = vi.fn(async () => {});
const wager = vi.fn(async () => {});
const claim = vi.fn(async () => {});
const resyncGame = vi.fn();
const onAddFunds = vi.fn();

function usdc(amount: string, usd: number) {
  return {
    amount,
    raw: String(Math.round(Number(amount) * 1e6)),
    token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    tokenSymbol: "USDC",
    decimals: 6,
    usdValue: usd,
    formattedUsd: `$${usd.toFixed(2)}`,
  };
}

function makeGame(over: Partial<VaultGame> = {}): VaultGame {
  return {
    gameId: 59,
    starter: STARTER,
    king: THEM,
    pot: usdc("1.16", 1.16),
    minWager: usdc("0.38", 0.38),
    // Far enough out that the local clock never reaches zero mid-test and
    // starts the round-end sequence on its own.
    endTime: Math.floor(Date.now() / 1000) + 600,
    timeRemaining: 600,
    settled: false,
    active: true,
    ...over,
  };
}

vi.mock("@/hooks/use-auth-session", () => ({
  useAuthSession: () => ({ evmAddress: world.address }),
}));

vi.mock("@/features/casino/hooks/use-vault-game", () => ({
  useVaultGame: () => ({
    game: world.game,
    loading: world.loading,
    error: world.error,
    notFound: world.notFound,
    connected: true,
    degraded: world.degraded,
    resync: resyncGame,
  }),
}));

vi.mock("@/features/casino/hooks/use-vault-feeds", () => ({
  useVaultFeeds: () => ({
    activities: world.activities,
    winners: world.winners,
    winnersLoading: false,
    activitiesLoading: false,
  }),
}));

vi.mock("@/features/casino/hooks/use-vault-actions", () => ({
  useVaultActions: () => ({
    wager,
    wagering: false,
    claim,
    claiming: false,
    settle,
    settling: false,
  }),
}));

vi.mock("@/features/casino/hooks/use-vault-winnings", () => ({
  useVaultPendingWinnings: () => ({
    pending: world.pending,
    hasPending: world.pending.length > 0,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/features/casino/hooks/use-game-balance", () => ({
  useGameBalance: () => ({
    balanceUsd: world.balanceUsd,
    balanceUnits: BigInt(Math.round(world.balanceUsd * 1e6)),
    settle: vi.fn(),
  }),
}));

vi.mock("@/features/casino/hooks/use-payout-refresh", () => ({ usePayoutRefresh: () => {} }));
vi.mock("@/features/casino/hooks/use-arcade-shine", () => ({ useVaultShine: () => {} }));
vi.mock("@/features/casino/hooks/use-vault-params", () => ({
  useVaultParams: () => ({ split: { winner: 5000, starter: 1000 } }),
}));
vi.mock("@/features/casino/hooks/use-leave-prompt", () => ({
  useLeavePrompt: () => ({ pending: null, leave: vi.fn(), stay: vi.fn() }),
}));
vi.mock("@/hooks/use-prices", () => ({ usePrices: () => ({ ETH: 3000 }) }));

vi.mock("@/components/ui/currency-select", () => ({
  useMoney: () => ({
    currency: { code: "USD" },
    ready: true,
    format: (n: number) => `$${n.toFixed(2)}`,
    formatExact: (n: number) => `$${n.toFixed(2)}`,
  }),
}));

// Web Audio, confetti and the analytics transport have no place in jsdom, and
// none of them is what this file is about.
vi.mock("@/features/casino/lib/last-standing/music", () => ({
  isMusicPlaying: () => false,
  setUrgentMode: () => {},
  armMusicOnGesture: () => () => {},
  disarmMusic: () => {},
  startMusic: () => {},
  stopMusic: () => {},
  subscribeMusic: () => () => {},
}));
vi.mock("@/features/casino/lib/last-standing/sound", () => ({
  playClaimSound: () => {},
  playDethronedSound: () => {},
  playRevealSound: () => {},
  playRoundEndSound: () => {},
  playWagerSound: () => {},
  setSoundEnabled: () => {},
}));
vi.mock("canvas-confetti", () => ({ default: () => {} }));
vi.mock("@/lib/analytics/mixpanel", () => ({ track: () => {} }));
vi.mock("@/lib/toast", () => ({
  toast: {
    loading: () => "toast",
    success: () => {},
    error: () => {},
  },
}));

// The broadcast panel carries its own session, queries and socket. That it is
// still mounted is the only thing this file cares about.
vi.mock("@/features/casino/components/broadcast", () => ({
  GameGoLive: () => <div data-testid="go-live" />,
}));

const { LastStandingSection } =
  await import("@/features/casino/components/last-standing/last-standing-section");

function renderSection() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <LastStandingSection gameId={59} onAddFunds={onAddFunds} />
    </NextIntlClientProvider>
  );
}

function railCard(kind: "action" | "invite" | "claim"): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-rail-card="${kind}"]`);
}

/** Pages the rail until the named card is on screen, or gives up. */
function openRailCard(kind: "action" | "invite" | "claim"): HTMLElement {
  const dots = screen.queryAllByRole("button", { name: /Go to card/u });
  for (let i = 0; i < Math.max(1, dots.length); i += 1) {
    const found = railCard(kind);
    if (found) return found;
    const next = screen.queryAllByRole("button", { name: /Go to card/u })[i];
    if (next) fireEvent.click(next);
  }
  const found = railCard(kind);
  if (!found) throw new Error(`the rail never reached the ${kind} card`);
  return found;
}

beforeEach(() => {
  vi.clearAllMocks();
  world = {
    address: ME,
    game: makeGame(),
    loading: false,
    error: false,
    notFound: false,
    degraded: false,
    activities: [],
    winners: [],
    balanceUsd: 25,
    pending: [],
  };
  // jsdom under this Node ships no matchMedia, and both the stage card and
  // motion's reduced-motion hook read it on mount.
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

describe("LastStandingSection page frame", () => {
  it("names the round in the breadcrumb and marks it live", () => {
    renderSection();

    const crumb = screen.getByTestId("lms-crumb-current");
    expect(crumb).toHaveTextContent(ls.title);
    expect(crumb).toHaveAttribute("data-live", "true");
    expect(screen.getByTestId("lms-pill")).toHaveTextContent(ls.pillLive);
    expect(screen.getByText(ls.tagline)).toBeInTheDocument();
  });

  it("drops the live marker and says so once the round is over", () => {
    world.game = makeGame({ active: false });
    renderSection();

    expect(screen.getByTestId("lms-crumb-current")).toHaveAttribute("data-live", "false");
    expect(screen.getByTestId("lms-pill")).toHaveTextContent(ls.pillEnded);
  });

  it("offers a retry and the lobby when the game cannot be loaded at all", () => {
    world.game = null;
    world.error = true;
    renderSection();

    expect(screen.getByRole("alert")).toHaveTextContent(ls.gameLoadFailedTitle);
    fireEvent.click(screen.getByRole("button", { name: ls.retry }));
    expect(resyncGame).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: ls.backToLobby })).toBeInTheDocument();
  });

  it("shows a loading stage rather than an empty clock before the game arrives", () => {
    world.game = null;
    world.loading = true;
    renderSection();

    expect(screen.getByTestId("stage-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("stage-card")).toBeNull();
  });
});

describe("LastStandingSection stage phases", () => {
  it("draws the not-started stage while the round has no leader", () => {
    world.game = makeGame({ king: ZERO });
    renderSection();

    expect(screen.getByTestId("stage-card")).toHaveAttribute("data-phase", "notStarted");
    expect(screen.getByTestId("stage-caption")).toHaveTextContent(ls.stageCaptionStart);
    expect(screen.getByText(ls.stageNoLeader)).toBeInTheDocument();
  });

  it("draws the live stage, the round number and the other player's lead", () => {
    renderSection();

    expect(screen.getByTestId("stage-card")).toHaveAttribute("data-phase", "live");
    expect(screen.getByText("Rounds #59")).toBeInTheDocument();
    expect(screen.getByTestId("stage-caption")).toHaveTextContent(ls.stageCaptionLive);
    expect(screen.getByTestId("stage-leader")).toHaveAttribute("data-you", "false");
    expect(screen.getByText(ls.stageLeadingOther)).toBeInTheDocument();
    expect(screen.getByTestId("stage-chip")).toHaveTextContent(ls.chipLeading);
  });

  it("marks the leader strip as yours when this wallet is in front", () => {
    world.game = makeGame({ king: ME });
    renderSection();

    expect(screen.getByTestId("stage-leader")).toHaveAttribute("data-you", "true");
    expect(screen.getByText(ls.stageLeadingYou)).toBeInTheDocument();
    expect(screen.getByTestId("stage-chip")).toHaveTextContent(ls.chipYou);
  });

  it("draws the ended stage and names the last player", () => {
    world.game = makeGame({ active: false });
    renderSection();

    expect(screen.getByTestId("stage-card")).toHaveAttribute("data-phase", "ended");
    expect(screen.getByText(ls.stageEndedTitle)).toBeInTheDocument();
    expect(screen.getByTestId("stage-chip")).toHaveTextContent(ls.chipWinner);
  });

  it("draws the won stage when this wallet was the last one standing", () => {
    world.game = makeGame({ active: false, king: ME });
    renderSection();

    expect(screen.getByTestId("stage-card")).toHaveAttribute("data-phase", "won");
    expect(screen.getByText(ls.stageWonTitle)).toBeInTheDocument();
  });

  it("shows the pot and the winner's share as formatted money", () => {
    renderSection();

    expect(within(screen.getByTestId("stage-pot")).getByText("$1.16")).toBeInTheDocument();
    // Half the pot: the leader did not open this game, so no starter's share.
    expect(within(screen.getByTestId("stage-winner-share")).getByText("$0.58")).toBeInTheDocument();
  });

  it("freezes and dims the clock while the connection is degraded", () => {
    world.degraded = true;
    renderSection();

    expect(screen.getByTestId("stage-clock")).toHaveAttribute("data-frozen", "true");
    expect(screen.getByTestId("lms-degraded")).toHaveTextContent(ls.connectionLostTitle);
  });
});

describe("LastStandingSection rail", () => {
  it("offers the play card and the invite, and nothing to claim, while a round runs", () => {
    renderSection();

    expect(railCard("action")).not.toBeNull();
    expect(railCard("claim")).toBeNull();
    expect(screen.getByText(ls.railAddHeading)).toBeInTheDocument();
    expect(screen.getByTestId("rail-badge")).toHaveAttribute("data-tone", "behind");
  });

  it("takes the start shape before anyone has played", () => {
    world.game = makeGame({ king: ZERO });
    renderSection();

    expect(screen.getByText(ls.railStartHeading)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ls.railStartCta })).toBeInTheDocument();
  });

  it("badges the play card as the lead when this wallet is in front", () => {
    world.game = makeGame({ king: ME });
    renderSection();

    expect(screen.getByTestId("rail-badge")).toHaveAttribute("data-tone", "lead");
    expect(screen.getByText(ls.railBadgeLead)).toBeInTheDocument();
  });

  it("wagers the stepper's amount, and steps it by the game's minimum", () => {
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: ls.stepperIncrease }));
    expect(screen.getByText("$0.76")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: ls.railAddCta }));
    expect(wager).toHaveBeenCalledWith(59, 760000n);
  });

  it("never steps the stake past the balance", () => {
    world.balanceUsd = 0.38;
    renderSection();

    expect(screen.getByRole("button", { name: ls.stepperIncrease })).toBeDisabled();
    expect(screen.getByRole("button", { name: ls.stepperDecrease })).toBeDisabled();
  });

  it("asks for money instead of a play when the balance is short", () => {
    world.balanceUsd = 0;
    renderSection();

    const cta = screen.getByRole("button", { name: ls.ctaAddMoney });
    fireEvent.click(cta);
    expect(onAddFunds).toHaveBeenCalled();
    expect(wager).not.toHaveBeenCalled();
  });

  it("keeps settle reachable when the round ended unsettled, and offers no play", () => {
    world.game = makeGame({ active: false, settled: false });
    renderSection();

    expect(railCard("action")).toBeNull();
    const claimCard = openRailCard("claim");
    expect(claimCard).toHaveTextContent(ls.claimStatusNotClaimed);

    fireEvent.click(within(claimCard).getByRole("button", { name: ls.ctaSettleRound }));
    expect(settle).toHaveBeenCalledWith(59);
  });

  it("offers the winner the settle-and-collect wording", () => {
    world.game = makeGame({ active: false, settled: false, king: ME });
    renderSection();

    expect(
      within(openRailCard("claim")).getByRole("button", { name: ls.ctaSettleCollect })
    ).toBeInTheDocument();
  });

  it("claims a payout the contract could not push", () => {
    world.game = makeGame({ active: false, settled: true });
    world.pending = [{ token: ZERO, raw: 580000n, amount: { decimals: 6 } }];
    renderSection();

    const claimCard = openRailCard("claim");
    expect(claimCard).toHaveTextContent(ls.railClaimReady);
    fireEvent.click(within(claimCard).getByRole("button", { name: /Claim \$0\.58/u }));
    expect(claim).toHaveBeenCalled();
  });

  it("shows no claim card on a settled round with nothing owed", () => {
    world.game = makeGame({ active: false, settled: true });
    renderSection();

    expect(railCard("claim")).toBeNull();
    expect(railCard("action")).toBeNull();
    expect(screen.getByRole("link", { name: ls.ctaStartAnother })).toBeInTheDocument();
  });

  it("pages from the play card to the invite, which is always offered", () => {
    renderSection();

    expect(railCard("invite")).toBeNull();
    const invite = openRailCard("invite");
    expect(within(invite).getByTestId("rail-qr")).toBeInTheDocument();
    expect(within(invite).getByText(ls.railInviteBadge)).toBeInTheDocument();
  });
});

describe("LastStandingSection activity panel", () => {
  it("lists a play with its player, action, amount and time", () => {
    world.activities = [
      {
        id: "a1",
        gameId: 59,
        action: "played",
        address: ME,
        amountWei: "380000",
        transactionHash: "0xabc",
        createdAt: new Date().toISOString(),
      },
      {
        id: "a2",
        gameId: 59,
        action: "won",
        address: THEM,
        amountWei: "580000",
        transactionHash: "0xdef",
        createdAt: new Date().toISOString(),
      },
    ] as VaultActivity[];
    renderSection();

    expect(screen.getByText(ls.colPlayer)).toBeInTheDocument();
    expect(screen.getByText(ls.actionPlayed)).toBeInTheDocument();
    expect(screen.getByText(ls.actionWon)).toBeInTheDocument();
    // Scoped to the table: the rail's stepper shows the same figure, because
    // the stake starts at the game's minimum.
    expect(within(screen.getByRole("table")).getByText("$0.38")).toBeInTheDocument();
  });

  it("says so plainly when nobody has played", () => {
    renderSection();
    expect(screen.getByText(ls.noPlays)).toBeInTheDocument();
  });

  it("reaches the game rules and the past rounds from the tabs", () => {
    renderSection();

    fireEvent.click(screen.getByRole("tab", { name: ls.tabRules }));
    expect(screen.getByText(ls.howTitle)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: ls.tabPastRounds }));
    expect(screen.getByText(ls.hallEmpty)).toBeInTheDocument();
  });
});
