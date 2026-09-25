import { createRef } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  StageCard,
  type StageCardProps,
  type StageLeader,
} from "@/features/casino/components/last-standing/stage-card";

// jsdom under this Node build ships no matchMedia, and the card reads
// prefers-reduced-motion through it on mount. Every test declares the
// preference it wants rather than leaning on a default, so the reduced-motion
// case is a real assertion and not an accident of the environment.
function setReducedMotion(reduced: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reduced : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const someoneElse: StageLeader = {
  label: "Currently leading",
  value: "0x36g3gt…993",
  isYou: false,
  avatarUrl: null,
  seed: "0x36g3gt993",
};

const you: StageLeader = {
  label: "You are currently leading",
  value: "You - 0x36g3gt…993",
  isYou: true,
  avatarUrl: null,
  seed: "0xmine",
};

function renderCard(props: Partial<StageCardProps> = {}) {
  const base: StageCardProps = {
    phase: "live",
    roundLabel: "Rounds #59",
    caption: "Each confirmed play resets the timer.",
    leader: someoneElse,
    countdown: "00:24",
    progress: 0.5,
  };
  return render(<StageCard {...base} {...props} />);
}

describe("StageCard", () => {
  beforeEach(() => {
    setReducedMotion(false);
  });

  describe("phases", () => {
    it("draws the not-started placeholder, caption and play glyph", () => {
      renderCard({
        phase: "notStarted",
        countdown: undefined,
        progress: undefined,
        caption: "The first confirmed play starts the round.",
      });

      expect(screen.getByText("Rounds #59")).toBeInTheDocument();
      expect(screen.getByTestId("stage-countdown")).toHaveTextContent("—:—");
      expect(screen.getByText("The first confirmed play starts the round.")).toBeInTheDocument();
      expect(screen.getByTestId("stage-glyph")).toHaveAttribute(
        "src",
        "/casino/last-standing/glyph-play.png"
      );
      // No round is running, so the ring shows its track alone.
      expect(screen.queryByTestId("stage-ring-arc")).toBeNull();
    });

    it("draws the live countdown, caption and hourglass glyph", () => {
      renderCard();

      expect(screen.getByTestId("stage-countdown")).toHaveTextContent("00:24");
      expect(screen.getByText("Each confirmed play resets the timer.")).toBeInTheDocument();
      expect(screen.getByTestId("stage-glyph")).toHaveAttribute(
        "src",
        "/casino/last-standing/glyph-hourglass.png"
      );
      expect(screen.getByTestId("stage-ring-arc")).toBeInTheDocument();
    });

    it("draws the ended heading, sub line and checkered flag", () => {
      renderCard({
        phase: "ended",
        countdown: undefined,
        progress: undefined,
        heading: "This Round Has Ended.",
        subheading: "0x36g3gt…993 was the last player",
        caption: "",
        leader: { ...someoneElse, label: "Round winner" },
      });

      expect(screen.getByRole("heading", { name: "This Round Has Ended." })).toBeInTheDocument();
      expect(screen.getByText("0x36g3gt…993 was the last player")).toBeInTheDocument();
      expect(screen.getByTestId("stage-glyph")).toHaveAttribute(
        "src",
        "/casino/last-standing/glyph-flag.png"
      );
      expect(screen.queryByTestId("stage-countdown")).toBeNull();
      expect(screen.queryByTestId("stage-ring-track")).toBeNull();
    });

    it("draws the won heading, sub line and crown glyph", () => {
      renderCard({
        phase: "won",
        countdown: undefined,
        progress: undefined,
        heading: "You Were The Last Man Standing",
        subheading: "The results is confirmed, your winnings are ready to claim.",
        caption: "",
        leader: { ...you, label: "Round winner" },
      });

      expect(
        screen.getByRole("heading", { name: "You Were The Last Man Standing" })
      ).toBeInTheDocument();
      expect(
        screen.getByText("The results is confirmed, your winnings are ready to claim.")
      ).toBeInTheDocument();
      expect(screen.getByTestId("stage-glyph")).toHaveAttribute(
        "src",
        "/casino/last-standing/glyph-crown.png"
      );
    });

    it("omits the caption line when the phase has no caption to show", () => {
      renderCard({ phase: "ended", heading: "This Round Has Ended.", caption: "" });

      expect(screen.queryByTestId("stage-caption")).toBeNull();
    });
  });

  describe("leader strip", () => {
    it("renders the leader's label and value", () => {
      renderCard();

      const strip = screen.getByTestId("stage-leader");
      expect(strip).toHaveTextContent("Currently leading");
      expect(strip).toHaveTextContent("0x36g3gt…993");
    });

    it("marks the strip when the leader is you", () => {
      renderCard({ leader: you, chip: { label: "You", tone: "filled" } });

      expect(screen.getByTestId("stage-leader")).toHaveAttribute("data-you", "true");
      expect(screen.getByText("You are currently leading")).toBeInTheDocument();
    });

    it("marks the strip when the leader is someone else", () => {
      renderCard({ leader: someoneElse, chip: { label: "Leading", tone: "outline" } });

      expect(screen.getByTestId("stage-leader")).toHaveAttribute("data-you", "false");
    });

    it("renders a filled chip with its label as text, not colour alone", () => {
      renderCard({ leader: you, chip: { label: "You", tone: "filled" } });

      const chip = screen.getByTestId("stage-chip");
      expect(chip).toHaveTextContent("You");
      expect(chip).toHaveAttribute("data-tone", "filled");
    });

    it("renders an outline chip with its own label", () => {
      renderCard({ chip: { label: "Leading", tone: "outline" } });

      const chip = screen.getByTestId("stage-chip");
      expect(chip).toHaveTextContent("Leading");
      expect(chip).toHaveAttribute("data-tone", "outline");
    });

    it("renders no chip when none is passed", () => {
      renderCard({
        phase: "notStarted",
        countdown: undefined,
        progress: undefined,
        leader: {
          label: "No leader yet",
          value: "The first confirmed play takes the lead.",
          isYou: false,
          avatarUrl: null,
          seed: "none",
        },
        chip: null,
      });

      expect(screen.getByText("No leader yet")).toBeInTheDocument();
      expect(screen.queryByTestId("stage-chip")).toBeNull();
    });

    // The strip and the activity table share one avatar, so a player without a
    // picture gets the same deterministic mark in both places rather than two
    // different fallbacks for one wallet.
    it("falls back to the shared avatar's deterministic mark with no image", () => {
      const { container } = renderCard();
      const avatar = screen.getByTestId("stage-avatar");

      expect(avatar.querySelector("img")).toBeNull();
      expect(avatar.textContent?.trim()).not.toBe("");

      const first = avatar.innerHTML;
      container.remove();
      renderCard();
      expect(screen.getByTestId("stage-avatar").innerHTML).toBe(first);
    });

    it("uses the leader's avatar image when one is given", () => {
      renderCard({ leader: { ...someoneElse, avatarUrl: "https://cdn.example/a.png" } });

      const image = screen.getByTestId("stage-avatar").querySelector("img");
      expect(image).toHaveAttribute("src", "https://cdn.example/a.png");
    });

    it("renders no strip at all when there is no leader", () => {
      renderCard({ leader: null });

      expect(screen.queryByTestId("stage-leader")).toBeNull();
    });
  });

  describe("stat tiles", () => {
    it("renders both tiles when both are passed", () => {
      renderCard({
        pot: { label: "Total Pot", value: "$20" },
        winnerShare: { label: "Winner's Share", value: "$10" },
      });

      const pot = screen.getByTestId("stage-pot");
      expect(pot).toHaveTextContent("Total Pot");
      expect(pot).toHaveTextContent("$20");

      const share = screen.getByTestId("stage-winner-share");
      expect(share).toHaveTextContent("Winner's Share");
      expect(share).toHaveTextContent("$10");
    });

    it("renders only the tile it is given", () => {
      renderCard({ pot: { label: "Total Pot", value: "$20" } });

      expect(screen.getByTestId("stage-pot")).toBeInTheDocument();
      expect(screen.queryByTestId("stage-winner-share")).toBeNull();
    });

    it("renders no tiles when neither is passed", () => {
      renderCard();

      expect(screen.queryByTestId("stage-tiles")).toBeNull();
    });

    // The wager's coin flight lands on the pot, and the pot is drawn in here,
    // so the caller needs a handle on that tile to aim at.
    it("hands the caller a ref to the pot tile", () => {
      const potRef = createRef<HTMLDivElement>();
      renderCard({ pot: { label: "Total Pot", value: "$20" }, potRef });

      expect(potRef.current).toBe(screen.getByTestId("stage-pot"));
    });

    it("ignores a pot ref when there is no pot tile to hold", () => {
      const potRef = createRef<HTMLDivElement>();
      renderCard({ potRef });

      expect(potRef.current).toBeNull();
    });
  });

  describe("countdown ring", () => {
    it("drives the arc's dash offset from progress", () => {
      renderCard({ progress: 0.5 });

      const arc = screen.getByTestId("stage-ring-arc");
      const circumference = Number(arc.getAttribute("data-circumference"));
      expect(circumference).toBeGreaterThan(0);
      expect(Number(arc.getAttribute("data-offset"))).toBeCloseTo(circumference * 0.5, 3);
    });

    it("clamps progress outside 0..1 rather than drawing past the ring", () => {
      renderCard({ progress: 1.8 });

      const arc = screen.getByTestId("stage-ring-arc");
      expect(Number(arc.getAttribute("data-offset"))).toBeCloseTo(0, 3);
    });

    it("draws a full ring when progress is missing on a live round", () => {
      renderCard({ progress: undefined });

      const arc = screen.getByTestId("stage-ring-arc");
      const circumference = Number(arc.getAttribute("data-circumference"));
      expect(Number(arc.getAttribute("data-offset"))).toBeCloseTo(0, 3);
      expect(circumference).toBeGreaterThan(0);
    });

    it("announces the clock politely rather than on every tick", () => {
      renderCard();

      expect(screen.getByTestId("stage-countdown")).toHaveAttribute("aria-live", "off");
    });
  });

  describe("frozen", () => {
    it("dims the clock and the ring when the connection is lost", () => {
      renderCard({ frozen: true });

      expect(screen.getByTestId("stage-clock")).toHaveAttribute("data-frozen", "true");
    });

    it("leaves the clock undimmed and adds nothing else while connected", () => {
      renderCard({ frozen: false });

      expect(screen.getByTestId("stage-clock")).toHaveAttribute("data-frozen", "false");
      expect(screen.queryByText(/connection/iu)).toBeNull();
    });
  });

  describe("reduced motion", () => {
    it("sweeps the arc when motion is allowed", () => {
      setReducedMotion(false);
      renderCard();

      expect(screen.getByTestId("stage-ring-arc")).toHaveAttribute("data-animated", "true");
    });

    it("draws a static arc when the viewer asked for reduced motion", () => {
      setReducedMotion(true);
      renderCard();

      const arc = screen.getByTestId("stage-ring-arc");
      expect(arc).toHaveAttribute("data-animated", "false");
      // The arc still reads correctly — only the sweep is dropped.
      const circumference = Number(arc.getAttribute("data-circumference"));
      expect(Number(arc.getAttribute("data-offset"))).toBeCloseTo(circumference * 0.5, 3);
    });
  });

  describe("overlay slot", () => {
    it("renders the children the lead hands it over the stage", () => {
      renderCard({ children: <p>Claim your winnings</p> });

      expect(screen.getByText("Claim your winnings")).toBeInTheDocument();
    });
  });
});
