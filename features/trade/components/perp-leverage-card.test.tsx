import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import {
  PerpLeverageCard,
  type PerpLeverageCardProps,
} from "@/features/trade/components/perp-leverage-card";

// Every string is read from the shipped English catalogue, so a renamed or
// dropped key fails here rather than reaching a trader as a raw key.
function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );
}

type HarnessProps = Partial<PerpLeverageCardProps> & { initial?: number };

// The card is controlled, so the tests drive it through a real state holder: a
// slider that moved without the parent agreeing would fail here.
function Harness({ initial = 10, onLeverageChange, ...rest }: HarnessProps) {
  const [leverage, setLeverage] = useState(initial);
  return (
    <PerpLeverageCard
      leverage={leverage}
      onLeverageChange={(next) => {
        onLeverageChange?.(next);
        setLeverage(next);
      }}
      max={20}
      {...rest}
    />
  );
}

function renderCard(props: HarnessProps = {}) {
  const onLeverageChange = vi.fn();
  const { container } = renderWithIntl(<Harness onLeverageChange={onLeverageChange} {...props} />);
  return {
    container,
    onLeverageChange,
    slider: screen.getByRole("slider", { name: en.perps.leverage }),
    chip: (label: string) => screen.getByRole("button", { name: label }),
  };
}

// How much of the track is painted, as a percentage. The fill is decorative,
// so it carries no role and no name and has to be reached through the DOM. Its
// width is a calc() of a percentage and a thumb-radius nudge; the percentage is
// the part that tracks the value, and reading it out rather than matching the
// whole string keeps the assertion off the browser's calc serialisation.
function paintedFillPercent(container: HTMLElement): number {
  const fill = container.querySelector<HTMLElement>(".bg-kash");
  if (!fill) throw new Error("the painted fill is not in the document");
  const percent = /calc\(\s*(-?[\d.]+)%/.exec(fill.style.width);
  if (!percent) throw new Error(`no percentage in the painted width: ${fill.style.width}`);
  return Number(percent[1]);
}

// ---------------------------------------------------------------------------
// Touch targets
//
// jsdom computes no layout and loads no Tailwind, so the pixel measurement
// that found this defect (46.3-54.4 x 27px against a 44px floor) belongs in a
// browser. What a suite can hold is the pair of facts that measurement rests
// on: the hit area is declared at 44px in both axes, and the painted pill is
// still the comp's. Either one on its own is passable and wrong.
// ---------------------------------------------------------------------------

describe("PerpLeverageCard touch targets", () => {
  it("gives every preset chip a 44px hit area", () => {
    renderCard({ initial: 10 });

    for (const label of ["2x", "5x", "10x", "20x"]) {
      const chip = screen.getByRole("button", { name: label });
      // A transparent overlay, so the hit area grows and the pill does not.
      expect(chip.className).toContain("relative");
      expect(chip.className).toContain("before:absolute");
      expect(chip.className).toContain("before:min-h-11");
      expect(chip.className).toContain("before:min-w-11");
      expect(chip.className).toContain("before:content-['']");
    }
  });

  it("gives the margin chips the same 44px hit area", () => {
    renderWithIntl(
      <PerpLeverageCard
        leverage={10}
        onLeverageChange={vi.fn()}
        max={20}
        marginMode="cross"
        onMarginModeChange={vi.fn()}
      />
    );

    for (const label of [en.perps.marginCross, en.perps.marginIsolated]) {
      const chip = screen.getByRole("button", { name: label });
      expect(chip.className).toContain("before:absolute");
      expect(chip.className).toContain("before:min-h-11");
    }
  });

  it("keeps the pill the comp paints, so the hit area is the only thing that grew", () => {
    renderWithIntl(
      <PerpLeverageCard
        leverage={10}
        onLeverageChange={vi.fn()}
        max={20}
        marginMode="cross"
        onMarginModeChange={vi.fn()}
      />
    );

    // The comp's leverage chip is 16px of horizontal and 6px of vertical
    // padding on a 13px label (173:43181). Growing the pill itself to reach
    // 44px would pass an accessibility audit and break the design, and this
    // card is shared with the desktop desk, so it would break that too.
    const leverageChip = screen.getByRole("button", { name: "10x" });
    expect(leverageChip.className).toContain("px-4");
    expect(leverageChip.className).toContain("py-1.5");
    expect(leverageChip.className).toContain("text-[13px]");
    // No height utility on the pill itself. Only the `before:` overlay may
    // carry one, which is what keeps the painted box at the comp's.
    const paintedHeight = leverageChip.className
      .split(/\s+/)
      .filter((token) => /^(min-|max-)?h-/.test(token));
    expect(paintedHeight).toEqual([]);

    const marginChip = screen.getByRole("button", { name: en.perps.marginCross });
    expect(marginChip.className).toContain("px-3");
    expect(marginChip.className).toContain("py-1.5");
  });
});

// ---------------------------------------------------------------------------
// The slider's accessible contract
// ---------------------------------------------------------------------------

describe("PerpLeverageCard slider", () => {
  it("is a native range on the market's own bounds", () => {
    const { slider } = renderCard({ initial: 10 });

    // Native, not a div with role="slider": the keyboard arithmetic, the
    // pointer handling and the value announcement are all the platform's.
    expect(slider.tagName).toBe("INPUT");
    expect(slider).toHaveAttribute("type", "range");
    expect(slider).toHaveAttribute("min", "1");
    expect(slider).toHaveAttribute("max", "20");
    expect(slider).toHaveAttribute("step", "1");
    expect(slider).toHaveAccessibleName(en.perps.leverage);
    // A bare "10" means nothing without its unit.
    expect(slider).toHaveAttribute("aria-valuetext", "10.0x");
  });

  it("moves the value, the announcement, the readout, the fill and the chips together", () => {
    // A key press on a native range raises exactly this event. The browser
    // owns the arithmetic behind each key (Arrow +/-1, Home, End, Page +/-2);
    // what this locks is that one arriving value moves all five surfaces, so
    // none of them can be left announcing the last one.
    const { slider, container } = renderCard({ initial: 10 });

    // 10x on a 1x..20x market is nine steps of nineteen.
    expect(paintedFillPercent(container)).toBeCloseTo(47.37, 1);

    fireEvent.change(slider, { target: { value: "11" } });

    expect(slider).toHaveValue("11");
    expect(slider).toHaveAttribute("aria-valuetext", "11.0x");
    expect(screen.getByText("11.0x")).toBeInTheDocument();
    expect(paintedFillPercent(container)).toBeCloseTo(52.63, 1);
    expect(screen.getByRole("button", { name: "10x" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.change(slider, { target: { value: "20" } });

    expect(slider).toHaveAttribute("aria-valuetext", "20.0x");
    expect(screen.getByText("20.0x")).toBeInTheDocument();
    expect(paintedFillPercent(container)).toBeCloseTo(100, 5);
    expect(screen.getByRole("button", { name: "20x" })).toHaveAttribute("aria-pressed", "true");
  });

  it("empties the track at the floor and fills it at the ceiling", () => {
    // End and Home land here in a browser. Measured from the floor, so 1x on a
    // 1x..20x market is an empty track and not a twentieth of one.
    const { slider, container } = renderCard({ initial: 10 });

    fireEvent.change(slider, { target: { value: "1" } });
    expect(screen.getByText("1.0x")).toBeInTheDocument();
    expect(slider).toHaveAttribute("aria-valuetext", "1.0x");
    expect(paintedFillPercent(container)).toBe(0);

    fireEvent.change(slider, { target: { value: "20" } });
    expect(screen.getByText("20.0x")).toBeInTheDocument();
    expect(slider).toHaveAttribute("aria-valuetext", "20.0x");
    expect(paintedFillPercent(container)).toBe(100);
  });

  it("puts the first chip next in the tab order after the slider", () => {
    const { slider } = renderCard({ initial: 10 });

    // Nothing focusable sits between them and neither carries a tabindex, so
    // document order is tab order.
    const focusable = Array.from(
      document.querySelectorAll<HTMLElement>("input, button:not([disabled])")
    );
    expect(focusable[focusable.indexOf(slider) + 1]).toBe(
      screen.getByRole("button", { name: "2x" })
    );
    expect(slider).not.toHaveAttribute("tabindex");
    expect(screen.getByRole("button", { name: "2x" })).not.toHaveAttribute("tabindex");
  });
});

// ---------------------------------------------------------------------------
// Leverage is a risk control
// ---------------------------------------------------------------------------

describe("PerpLeverageCard leverage ceiling", () => {
  it("draws only the multipliers the venue would take", () => {
    // A chip for a multiplier the venue rejects is not a choice, it is a dead
    // control that reads as an offer of risk the market will not give.
    renderWithIntl(<PerpLeverageCard leverage={2} onLeverageChange={vi.fn()} max={3} />);

    expect(screen.getByRole("button", { name: "2x" })).toBeInTheDocument();
    for (const above of ["5x", "10x", "20x"]) {
      expect(screen.queryByRole("button", { name: above })).not.toBeInTheDocument();
    }
    expect(screen.getByRole("slider", { name: en.perps.leverage })).toHaveAttribute("max", "3");
  });

  it("takes a ceiling above the preset row without inventing a chip for it", () => {
    renderWithIntl(<PerpLeverageCard leverage={10} onLeverageChange={vi.fn()} max={40} />);

    expect(screen.getByRole("slider", { name: en.perps.leverage })).toHaveAttribute("max", "40");
    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "40x" })).not.toBeInTheDocument();
  });

  it("refuses a value the market cannot take, wherever it came from", () => {
    const onLeverageChange = vi.fn();
    renderWithIntl(<PerpLeverageCard leverage={99} onLeverageChange={onLeverageChange} max={20} />);

    expect(screen.getByRole("slider", { name: en.perps.leverage })).toHaveValue("20");
    expect(screen.getByText("20.0x")).toBeInTheDocument();
  });
});
