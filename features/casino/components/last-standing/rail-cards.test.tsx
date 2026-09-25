import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  RailActionCard,
  RailClaimCard,
  RailInviteCard,
  RailPager,
  type RailActionCardProps,
  type RailClaimCardProps,
  type RailInviteCardProps,
} from "@/features/casino/components/last-standing/rail-cards";

// The rail cards are pure presentation: every string, every handler and the QR
// node itself arrive as props. These tests therefore never mock anything — they
// hand the card props and read the DOM back.

function actionProps(over: Partial<RailActionCardProps> = {}): RailActionCardProps {
  return {
    badge: { label: "Waiting for the first play", tone: "waiting" },
    heading: "Start The Round",
    sub: "Be the last man and win the winner's share.",
    amountLabel: "Play Amount",
    stepper: {
      amount: "$0.38",
      currency: "USD",
      onDecrement: vi.fn(),
      onIncrement: vi.fn(),
      canDecrement: true,
      canIncrement: true,
    },
    cta: { label: "Start Game", icon: "play", onPress: vi.fn() },
    ...over,
  };
}

function inviteProps(over: Partial<RailInviteCardProps> = {}): RailInviteCardProps {
  return {
    badge: { label: "You earn 10%", tone: "waiting" },
    heading: "Invite players",
    sub: "Every player who joins grows the pot, and you take 10% of it when the timer ends.",
    qr: <i data-testid="qr" />,
    caption: "Scan to join game.",
    share: { label: "Share", onPress: vi.fn() },
    ...over,
  };
}

function claimProps(over: Partial<RailClaimCardProps> = {}): RailClaimCardProps {
  return {
    heading: "Claim Your Winnings",
    shareLabel: "Winner's Share",
    shareValue: "$0.58",
    status: { label: "Ready to claim", ready: true },
    rows: [
      { label: "Final pot", value: "$1.16" },
      { label: "Winner Allocation", value: "$0.58" },
      { label: "Claim Status", value: "Not Claimed" },
    ],
    cta: { label: "Claim $0.58", onPress: vi.fn() },
    ...over,
  };
}

describe("RailActionCard", () => {
  it("prints the badge, heading, sub, amount label and stake", () => {
    render(<RailActionCard {...actionProps()} />);

    expect(screen.getByText("Waiting for the first play")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Start The Round" })).toBeTruthy();
    expect(screen.getByText("Be the last man and win the winner's share.")).toBeTruthy();
    expect(screen.getByText("Play Amount")).toBeTruthy();
    expect(screen.getByText("$0.38")).toBeTruthy();
    expect(screen.getByText("USD")).toBeTruthy();
  });

  it("omits the badge when there is none", () => {
    render(<RailActionCard {...actionProps({ badge: null })} />);
    expect(screen.queryByTestId("rail-badge")).toBeNull();
  });

  // The three tones are the whole story the badge tells: you are winning,
  // someone else is, or nobody has played yet. Each gets its own colour, so a
  // glance is enough.
  it("colours the lead badge amber", () => {
    render(
      <RailActionCard {...actionProps({ badge: { label: "You are in the lead", tone: "lead" } })} />
    );
    const badge = screen.getByTestId("rail-badge");
    expect(badge.dataset.tone).toBe("lead");
    expect(badge.className).toContain("#ffe178");
  });

  it("colours the behind badge red", () => {
    render(
      <RailActionCard
        {...actionProps({ badge: { label: "Another player is leading", tone: "behind" } })}
      />
    );
    const badge = screen.getByTestId("rail-badge");
    expect(badge.dataset.tone).toBe("behind");
    expect(badge.className).toContain("text-down");
  });

  it("colours the waiting badge grey", () => {
    render(<RailActionCard {...actionProps()} />);
    const badge = screen.getByTestId("rail-badge");
    expect(badge.dataset.tone).toBe("waiting");
    expect(badge.className).toContain("text-white/40");
    expect(badge.className).not.toContain("text-down");
  });

  it("steps the stake up and down", () => {
    const props = actionProps();
    render(<RailActionCard {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Increase Play Amount" }));
    fireEvent.click(screen.getByRole("button", { name: "Decrease Play Amount" }));

    expect(props.stepper.onIncrement).toHaveBeenCalledTimes(1);
    expect(props.stepper.onDecrement).toHaveBeenCalledTimes(1);
  });

  it("takes bespoke stepper labels when the caller localises them", () => {
    const props = actionProps();
    render(
      <RailActionCard
        {...actionProps({
          stepper: { ...props.stepper, decrementLabel: "Moins", incrementLabel: "Plus" },
        })}
      />
    );

    expect(screen.getByRole("button", { name: "Moins" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Plus" })).toBeTruthy();
  });

  // At the bottom of the range the minus must be dead, not merely quiet: a
  // click that still fired would walk the stake below the floor.
  it("kills the minus at the floor", () => {
    const props = actionProps();
    render(
      <RailActionCard {...actionProps({ stepper: { ...props.stepper, canDecrement: false } })} />
    );

    const minus = screen.getByRole("button", { name: "Decrease Play Amount" });
    expect((minus as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(minus);
    expect(props.stepper.onDecrement).not.toHaveBeenCalled();
  });

  it("kills the plus at the ceiling", () => {
    const props = actionProps();
    render(
      <RailActionCard {...actionProps({ stepper: { ...props.stepper, canIncrement: false } })} />
    );

    const plus = screen.getByRole("button", { name: "Increase Play Amount" });
    expect((plus as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(plus);
    expect(props.stepper.onIncrement).not.toHaveBeenCalled();
  });

  it("kills both steps while the stepper is disabled", () => {
    const props = actionProps();
    render(<RailActionCard {...actionProps({ stepper: { ...props.stepper, disabled: true } })} />);

    const minus = screen.getByRole("button", { name: "Decrease Play Amount" });
    const plus = screen.getByRole("button", { name: "Increase Play Amount" });
    expect((minus as HTMLButtonElement).disabled).toBe(true);
    expect((plus as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(minus);
    fireEvent.click(plus);
    expect(props.stepper.onDecrement).not.toHaveBeenCalled();
    expect(props.stepper.onIncrement).not.toHaveBeenCalled();
  });

  it("fires the call to action and draws its play icon", () => {
    const props = actionProps();
    render(<RailActionCard {...props} />);

    const cta = screen.getByRole("button", { name: /Start Game/u });
    expect(cta.querySelector("svg")).toBeTruthy();
    fireEvent.click(cta);
    expect(props.cta.onPress).toHaveBeenCalledTimes(1);
  });

  it("drops the icon when the call to action has none", () => {
    render(
      <RailActionCard
        {...actionProps({ cta: { label: "Add to position", icon: null, onPress: vi.fn() } })}
      />
    );
    const cta = screen.getByRole("button", { name: "Add to position" });
    expect(cta.querySelector("svg")).toBeNull();
  });

  it("spins and locks the call to action while busy", () => {
    const props = actionProps();
    render(<RailActionCard {...actionProps({ cta: { ...props.cta, busy: true } })} />);

    const cta = screen.getByRole("button", { name: /Start Game/u });
    expect((cta as HTMLButtonElement).disabled).toBe(true);
    expect(cta.querySelector(".animate-spin")).toBeTruthy();
    fireEvent.click(cta);
    expect(props.cta.onPress).not.toHaveBeenCalled();
  });

  it("locks a disabled call to action without spinning", () => {
    const props = actionProps();
    render(<RailActionCard {...actionProps({ cta: { ...props.cta, disabled: true } })} />);

    const cta = screen.getByRole("button", { name: /Start Game/u });
    expect((cta as HTMLButtonElement).disabled).toBe(true);
    expect(cta.querySelector(".animate-spin")).toBeNull();
    fireEvent.click(cta);
    expect(props.cta.onPress).not.toHaveBeenCalled();
  });
});

describe("RailInviteCard", () => {
  it("prints the heading, badge, sub and caption around the supplied code", () => {
    render(<RailInviteCard {...inviteProps()} />);

    expect(screen.getByRole("heading", { name: "Invite players" })).toBeTruthy();
    expect(screen.getByText("You earn 10%")).toBeTruthy();
    expect(
      screen.getByText(
        "Every player who joins grows the pot, and you take 10% of it when the timer ends."
      )
    ).toBeTruthy();
    expect(screen.getByText("Scan to join game.")).toBeTruthy();
  });

  // The card never generates a code. Whatever node the rail hands it is what
  // sits in the white tile.
  it("mounts the caller's code inside the tile", () => {
    render(<RailInviteCard {...inviteProps()} />);
    const tile = screen.getByTestId("rail-qr");
    expect(within(tile).getByTestId("qr")).toBeTruthy();
    expect(tile.className).toContain("bg-white");
  });

  it("shares on press", () => {
    const props = inviteProps();
    render(<RailInviteCard {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /Share/u }));
    expect(props.share.onPress).toHaveBeenCalledTimes(1);
  });

  it("omits the badge when there is none", () => {
    render(<RailInviteCard {...inviteProps({ badge: null })} />);
    expect(screen.queryByTestId("rail-badge")).toBeNull();
  });
});

describe("RailClaimCard", () => {
  it("prints the heading, winner's share and every detail row", () => {
    render(<RailClaimCard {...claimProps()} />);

    expect(screen.getByRole("heading", { name: "Claim Your Winnings" })).toBeTruthy();
    expect(screen.getByText("Winner's Share")).toBeTruthy();
    expect(screen.getByText("Final pot")).toBeTruthy();
    expect(screen.getByText("$1.16")).toBeTruthy();
    expect(screen.getByText("Winner Allocation")).toBeTruthy();
    expect(screen.getByText("Claim Status")).toBeTruthy();
    expect(screen.getByText("Not Claimed")).toBeTruthy();
    // The winner's share and the allocation row carry the same figure, so it
    // appears twice — once big, once in the breakdown.
    expect(screen.getAllByText("$0.58")).toHaveLength(2);
  });

  it("renders exactly the rows it is given", () => {
    render(<RailClaimCard {...claimProps({ rows: [{ label: "Final pot", value: "$9.00" }] })} />);
    expect(screen.getAllByTestId("rail-claim-row")).toHaveLength(1);
  });

  it("flags a claimable payout in amber", () => {
    render(<RailClaimCard {...claimProps()} />);
    const badge = screen.getByTestId("rail-badge");
    expect(screen.getByText("Ready to claim")).toBeTruthy();
    expect(badge.dataset.tone).toBe("lead");
    expect(badge.className).toContain("#ffe178");
  });

  it("greys the status out when nothing is claimable yet", () => {
    render(<RailClaimCard {...claimProps({ status: { label: "Settling", ready: false } })} />);
    const badge = screen.getByTestId("rail-badge");
    expect(badge.dataset.tone).toBe("waiting");
    expect(badge.className).not.toContain("#ffe178");
  });

  it("claims on press", () => {
    const props = claimProps();
    render(<RailClaimCard {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /Claim \$0\.58/u }));
    expect(props.cta.onPress).toHaveBeenCalledTimes(1);
  });

  it("spins and locks the claim while busy", () => {
    const props = claimProps();
    render(<RailClaimCard {...claimProps({ cta: { ...props.cta, busy: true } })} />);

    const cta = screen.getByRole("button", { name: /Claim \$0\.58/u });
    expect((cta as HTMLButtonElement).disabled).toBe(true);
    expect(cta.querySelector(".animate-spin")).toBeTruthy();
    fireEvent.click(cta);
    expect(props.cta.onPress).not.toHaveBeenCalled();
  });

  it("locks a disabled claim", () => {
    const props = claimProps();
    render(<RailClaimCard {...claimProps({ cta: { ...props.cta, disabled: true } })} />);

    const cta = screen.getByRole("button", { name: /Claim \$0\.58/u });
    expect((cta as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(cta);
    expect(props.cta.onPress).not.toHaveBeenCalled();
  });
});

describe("RailPager", () => {
  it("names every dot for a screen reader", () => {
    render(
      <RailPager
        count={3}
        index={1}
        onSelect={vi.fn()}
        itemLabel={(i, count) => `Go to card ${i + 1} of ${count}`}
      />
    );

    expect(screen.getByRole("button", { name: "Go to card 1 of 3" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Go to card 2 of 3" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Go to card 3 of 3" })).toBeTruthy();
  });

  it("marks only the active dot as current", () => {
    render(
      <RailPager
        count={3}
        index={1}
        onSelect={vi.fn()}
        itemLabel={(i, count) => `Go to card ${i + 1} of ${count}`}
      />
    );

    expect(
      screen.getByRole("button", { name: "Go to card 2 of 3" }).getAttribute("aria-current")
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "Go to card 1 of 3" }).getAttribute("aria-current")
    ).toBeNull();
  });

  it("selects the dot that was pressed", () => {
    const onSelect = vi.fn();
    render(
      <RailPager
        count={3}
        index={0}
        onSelect={onSelect}
        itemLabel={(i, count) => `Go to card ${i + 1} of ${count}`}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Go to card 3 of 3" }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  // A thumb needs 44px even though the dot itself is 10px across, so the
  // target is the button and the dot is only what you see.
  it("keeps a thumb-sized target under each dot", () => {
    render(
      <RailPager
        count={2}
        index={0}
        onSelect={vi.fn()}
        itemLabel={(i, count) => `Go to card ${i + 1} of ${count}`}
      />
    );
    const dot = screen.getByRole("button", { name: "Go to card 1 of 2" });
    expect(dot.className).toContain("size-11");
  });

  it("draws nothing for a single card", () => {
    const { container } = render(
      <RailPager
        count={1}
        index={0}
        onSelect={vi.fn()}
        itemLabel={(i, count) => `Go to card ${i + 1} of ${count}`}
      />
    );
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });
});

// The wager's coin flight launches from this button's viewport box, and the
// button is drawn in here rather than by the rail that owns the animation.
describe("RailActionCard cta handle", () => {
  it("hands the caller the action button itself", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<RailActionCard {...actionProps()} ctaRef={ref} />);

    expect(ref.current).toBe(screen.getByRole("button", { name: "Start Game" }));
  });

  it("stands without one", () => {
    render(<RailActionCard {...actionProps()} />);
    expect(screen.getByRole("button", { name: "Start Game" })).toBeInTheDocument();
  });
});
