// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MigrationProgress } from "@/features/migrate/components/move-old-money-panel";

const state = vi.hoisted(() => ({
  offer: true,
  evm: "0xAbC0000000000000000000000000000000000001" as string | null,
}));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/analytics/mixpanel", () => ({ track: vi.fn() }));
vi.mock("@/features/migrate/hooks/use-offer-migration", () => ({
  useOfferMigration: () => state.offer,
}));
vi.mock("@/hooks/use-auth-session", () => ({
  useAuthSession: () => ({
    ready: true,
    authenticated: true,
    evmAddress: state.evm,
    solanaAddress: null,
    profile: { name: "u", email: "", avatarSeed: "u" },
    logout: vi.fn(),
  }),
}));
vi.mock("@/components/providers/legacy-privy-provider", () => ({
  LegacyPrivyProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/features/migrate/components/migration-gate-header", () => ({
  MigrationGateHeader: () => <div data-testid="header" />,
}));
vi.mock("@/features/migrate/components/move-old-money-sheet", () => ({
  MoveOldMoneyFrame: ({
    children,
    dismissible,
  }: {
    children: React.ReactNode;
    dismissible?: boolean;
  }) => (
    <div data-testid="frame" data-dismissible={String(dismissible)}>
      {children}
    </div>
  ),
}));
// A stand-in panel the test drives: report a progress shape, or press onClose.
vi.mock("@/features/migrate/components/move-old-money-panel", () => ({
  MoveOldMoneyPanel: ({
    locked,
    onProgress,
    onClose,
  }: {
    locked?: boolean;
    onProgress?: (p: MigrationProgress) => void;
    onClose: () => void;
  }) => {
    const emit = (p: Partial<MigrationProgress>) =>
      onProgress?.({
        stage: "move",
        linked: true,
        discovered: true,
        remaining: 0,
        coreRemaining: 0,
        blocked: false,
        failures: 0,
        walletBlocked: false,
        ...p,
      });
    return (
      <div data-testid="panel" data-locked={String(locked)}>
        <button onClick={() => emit({ coreRemaining: 1, remaining: 1 })}>core-left</button>
        <button onClick={() => emit({ stage: "finish", linked: false, coreRemaining: 0 })}>
          not-linked
        </button>
        <button onClick={() => emit({ coreRemaining: 0, remaining: 3 })}>
          core-done-tail-left
        </button>
        <button
          onClick={() => emit({ linked: false, coreRemaining: 1, remaining: 1, blocked: true })}
        >
          link-blocked
        </button>
        <button onClick={() => emit({ stage: "signIn", linked: false, discovered: false })}>
          sign-in-step
        </button>
        <button onClick={() => emit({ linked: false, discovered: false, failures: 3 })}>
          stuck
        </button>
        <button onClick={() => emit({ linked: false, discovered: false, failures: 2 })}>
          not-yet-stuck
        </button>
        <button
          onClick={() => emit({ linked: false, coreRemaining: 1, blocked: true, failures: 5 })}
        >
          blocked-and-stuck
        </button>
        <button onClick={() => emit({ linked: false, discovered: false, walletBlocked: true })}>
          wallet-blocked
        </button>
        <button onClick={onClose}>panel-exit</button>
      </div>
    );
  },
}));

import { MigrationGate } from "@/features/migrate/components/migration-gate";

const KEY = "ws.migrationGateDone:0xabc0000000000000000000000000000000000001";
const SNOOZE_KEY = "ws.migrationGateSnooze:0xabc0000000000000000000000000000000000001";

beforeEach(() => {
  state.offer = true;
  state.evm = "0xAbC0000000000000000000000000000000000001";
});
afterEach(() => {
  window.localStorage.clear();
});

describe("MigrationGate", () => {
  it("renders nothing when the migration is not offered", () => {
    state.offer = false;
    render(<MigrationGate adapters={[]} />);
    expect(screen.queryByTestId("frame")).not.toBeInTheDocument();
  });

  it("opens locked and non-dismissable, with no way out while core money is left", () => {
    render(<MigrationGate adapters={[]} />);
    expect(screen.getByTestId("frame")).toHaveAttribute("data-dismissible", "false");
    expect(screen.getByTestId("panel")).toHaveAttribute("data-locked", "true");
    fireEvent.click(screen.getByText("core-left"));
    expect(screen.queryByText("gateFinish")).not.toBeInTheDocument();
    expect(screen.getByText("gateCoreLeft")).toBeInTheDocument();
    fireEvent.click(screen.getByText("panel-exit"));
    expect(screen.getByTestId("frame")).toBeInTheDocument();
  });

  // The point of the core rule: the long tail (memecoins, perps) does not hold
  // the gate. Core moved, three tail holdings left, and the exit is offered.
  it("lets the user through once core is clear, even with the long tail remaining", () => {
    render(<MigrationGate adapters={[]} />);
    fireEvent.click(screen.getByText("core-done-tail-left"));
    expect(screen.getByText("gateFinish")).toBeInTheDocument();
    fireEvent.click(screen.getByText("gateFinish"));
    expect(screen.queryByTestId("frame")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(KEY)).toBe("1");
  });

  it("stays shut when core moved but the link never landed", () => {
    render(<MigrationGate adapters={[]} />);
    fireEvent.click(screen.getByText("not-linked"));
    expect(screen.queryByText("gateFinish")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("panel-exit"));
    expect(screen.getByTestId("frame")).toBeInTheDocument();
  });

  // A link that can never land (the old wallet belongs to another account)
  // must not trap the user. The gate offers an explicit way out even though
  // the account is not linked and core money is still reported.
  it("offers a way out when linking is terminally blocked", () => {
    render(<MigrationGate adapters={[]} />);
    fireEvent.click(screen.getByText("link-blocked"));
    expect(screen.queryByText("gateFinish")).not.toBeInTheDocument();
    expect(screen.queryByText("gateCoreLeft")).not.toBeInTheDocument();
    expect(screen.getByText("gateBlockedBody")).toBeInTheDocument();
    fireEvent.click(screen.getByText("gateBlockedExit"));
    expect(screen.queryByTestId("frame")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(KEY)).toBe("1");
  });

  it("does not return for an account that finished, even while the service still reports funds", () => {
    window.localStorage.setItem(KEY, "1");
    render(<MigrationGate adapters={[]} />);
    expect(screen.queryByTestId("frame")).not.toBeInTheDocument();
  });

  // The old device-wide flag hid the migration from the next user of the same
  // browser. This one is keyed by account, so another account still gets it.
  it("still gates a different account on the same device", () => {
    window.localStorage.setItem(KEY, "1");
    state.evm = "0xDeF0000000000000000000000000000000000002";
    render(<MigrationGate adapters={[]} />);
    expect(screen.getByTestId("frame")).toBeInTheDocument();
  });
});

// The three traps. Each exit is a snooze — a delay — never the done flag.
describe("MigrationGate — ways out of a trap", () => {
  it("lets a user who cannot sign into the old account put the gate away, after confirming", () => {
    render(<MigrationGate adapters={[]} />);
    fireEvent.click(screen.getByText("sign-in-step"));
    expect(screen.queryByText("gateNoAccessBody")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("gateNoAccess"));
    expect(screen.getByText("gateNoAccessBody")).toBeInTheDocument();
    // Changing their mind puts the link back.
    fireEvent.click(screen.getByText("gateNoAccessBack"));
    expect(screen.queryByText("gateNoAccessBody")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("gateNoAccess"));
    fireEvent.click(screen.getByText("gateContinueLater"));
    expect(screen.queryByTestId("frame")).not.toBeInTheDocument();
    expect(Number(window.localStorage.getItem(SNOOZE_KEY))).toBeGreaterThan(Date.now());
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("offers a way out once the current step has failed enough times in a row", () => {
    render(<MigrationGate adapters={[]} />);
    fireEvent.click(screen.getByText("not-yet-stuck"));
    expect(screen.queryByText("gateStuckBody")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("stuck"));
    expect(screen.getByText("gateStuckBody")).toBeInTheDocument();
    expect(screen.queryByText("gateFinish")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("gateContinueLater"));
    expect(screen.queryByTestId("frame")).not.toBeInTheDocument();
    expect(Number(window.localStorage.getItem(SNOOZE_KEY))).toBeGreaterThan(Date.now());
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("does not offer the sign-in exit while core money is being moved", () => {
    render(<MigrationGate adapters={[]} />);
    fireEvent.click(screen.getByText("core-left"));
    expect(screen.queryByText("gateNoAccess")).not.toBeInTheDocument();
    expect(screen.getByText("gateCoreLeft")).toBeInTheDocument();
  });

  it("keeps the permanent exit for a link that can never succeed, over the snooze", () => {
    render(<MigrationGate adapters={[]} />);
    fireEvent.click(screen.getByText("blocked-and-stuck"));
    expect(screen.getByText("gateBlockedBody")).toBeInTheDocument();
    expect(screen.queryByText("gateStuckBody")).not.toBeInTheDocument();
  });

  it("stays away while snoozed and returns once the window lapses", () => {
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + 60_000));
    const { unmount } = render(<MigrationGate adapters={[]} />);
    expect(screen.queryByTestId("frame")).not.toBeInTheDocument();
    unmount();
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now() - 1));
    render(<MigrationGate adapters={[]} />);
    expect(screen.getByTestId("frame")).toBeInTheDocument();
  });
});

// Seen live: the panel linked the account, the service reported it, the offer
// flipped to "no", and the gate unmounted — tearing down the Privy iframe the
// automatic sweep was signing with ("iframe did not initialize"). The link was
// then cached, so the gate never came back to retry from. The money stayed
// behind. The offer may open the gate; only the gate's own exits may close it.
describe("MigrationGate — stays open once opened", () => {
  it("does not unmount when the offer flips to no mid-flow, and still finishes on its own exit", () => {
    const { rerender } = render(<MigrationGate adapters={[]} />);
    expect(screen.getByTestId("frame")).toBeInTheDocument();
    // The link lands: the offer is now "no". The sweep is still running.
    state.offer = false;
    rerender(<MigrationGate adapters={[]} />);
    expect(screen.getByTestId("frame")).toBeInTheDocument();
    // The sweep completes; the gate's own exit closes it.
    fireEvent.click(screen.getByText("core-done-tail-left"));
    fireEvent.click(screen.getByText("gateFinish"));
    expect(screen.queryByTestId("frame")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(KEY)).toBe("1");
  });

  it("never opens for an account that was already linked before it mounted", () => {
    state.offer = false;
    render(<MigrationGate adapters={[]} />);
    expect(screen.queryByTestId("frame")).not.toBeInTheDocument();
  });
});

// A browser that will not load Privy's wallet window cannot be fixed by
// retrying, so the user is not made to fail three times before the way out.
describe("MigrationGate — blocked wallet window", () => {
  it("offers a way out at once, without waiting for three failures", () => {
    render(<MigrationGate adapters={[]} />);
    fireEvent.click(screen.getByText("wallet-blocked"));
    expect(screen.getByText("gateWalletBlockedBody")).toBeInTheDocument();
    expect(screen.queryByText("gateStuckBody")).not.toBeInTheDocument();
    expect(screen.queryByText("gateNoAccess")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("gateContinueLater"));
    expect(screen.queryByTestId("frame")).not.toBeInTheDocument();
    expect(Number(window.localStorage.getItem(SNOOZE_KEY))).toBeGreaterThan(Date.now());
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });
});
