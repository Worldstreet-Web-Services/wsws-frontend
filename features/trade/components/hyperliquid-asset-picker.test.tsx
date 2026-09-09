import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HyperliquidAssetPicker } from "@/features/trade/components/hyperliquid-asset-picker";
import type { HlAsset, HlMarketContext } from "@/features/trade/lib/hyperliquid-types";

function makeAsset(symbol: string, assetIndex: number): HlAsset {
  return {
    id: `asset-${symbol}`,
    assetIndex,
    dex: "",
    symbol,
    category: "crypto",
    szDecimals: 3,
    maxLeverage: 40,
    isActive: true,
  };
}

function makeContext(symbol: string, overrides: Partial<HlMarketContext> = {}): HlMarketContext {
  return {
    symbol,
    markPrice: "64000",
    oraclePrice: "64000",
    prevDayPrice: "62000",
    dayVolumeUsd: "1250000",
    openInterest: "42",
    fundingRate: "0.0000125",
    ...overrides,
  };
}

const assets = [makeAsset("BTC", 0), makeAsset("ETH", 1)];
const prices: Record<string, string> = { BTC: "64000", ETH: "3200" };
const contexts = [makeContext("BTC"), makeContext("ETH", { markPrice: "3200" })];

function renderPicker(props: Partial<Parameters<typeof HyperliquidAssetPicker>[0]> = {}) {
  return render(
    <HyperliquidAssetPicker
      assets={assets}
      prices={prices}
      contexts={contexts}
      selected="BTC"
      onSelect={() => {}}
      loading={false}
      {...props}
    />
  );
}

function trigger(): HTMLElement {
  const found = screen
    .getAllByRole("button", { name: /BTC-USDC/ })
    .find((element) => element.getAttribute("aria-haspopup") === "listbox");
  if (!found) throw new Error("the picker rendered no market trigger");
  return found;
}

function searchField(): HTMLElement {
  return screen.getByRole("textbox", { name: /search markets/i });
}

describe("HyperliquidAssetPicker", () => {
  it("keeps the trigger announcing the listbox it owns", () => {
    renderPicker();

    // Locked by a previous accessibility fix: the caret is decorative, so the
    // accessible name is the pair alone, and the trigger says what it opens.
    const button = trigger();
    expect(button).toHaveAttribute("aria-haspopup", "listbox");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button.textContent).toContain("▾");
    expect(button.querySelector("[aria-hidden]")?.textContent).toBe("▾");
    expect(button.getAttribute("aria-label")).toBeNull();

    fireEvent.click(button);
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("closes on Escape, puts focus back on the trigger, and does not let the key reach the window", () => {
    // The perps screen listens on window for Escape and means "leave
    // fullscreen" by it. A menu-open Escape has to stop at the menu.
    const windowListener = vi.fn();
    window.addEventListener("keydown", windowListener);

    try {
      renderPicker();
      const button = trigger();
      fireEvent.click(button);
      const search = searchField();
      windowListener.mockClear();

      fireEvent.keyDown(search, { key: "Escape" });

      expect(screen.queryByRole("listbox")).toBeNull();
      expect(button).toHaveFocus();
      expect(windowListener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("keydown", windowListener);
    }
  });

  it("lets Escape through to the window when the menu is already closed", () => {
    const windowListener = vi.fn();
    window.addEventListener("keydown", windowListener);

    try {
      renderPicker();
      fireEvent.keyDown(trigger(), { key: "Escape" });
      expect(windowListener).toHaveBeenCalled();
    } finally {
      window.removeEventListener("keydown", windowListener);
    }
  });

  it("closes when a pointer goes down outside it", () => {
    renderPicker();
    fireEvent.click(trigger());
    expect(screen.queryByRole("listbox")).not.toBeNull();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("stays open when the pointer goes down inside it", () => {
    renderPicker();
    fireEvent.click(trigger());

    fireEvent.pointerDown(searchField());

    expect(screen.queryByRole("listbox")).not.toBeNull();
  });

  it("clears the search box when it closes, so it reopens clean", () => {
    renderPicker();
    fireEvent.click(trigger());
    fireEvent.change(searchField(), { target: { value: "eth" } });
    fireEvent.pointerDown(document.body);

    fireEvent.click(trigger());

    expect(searchField()).toHaveValue("");
  });

  it("hands an open state to a controlled caller instead of owning it", () => {
    const onOpenChange = vi.fn();
    const { rerender } = renderPicker({ open: false, onOpenChange });

    // A controlled picker never opens itself: it asks, and stays as the
    // caller left it until the caller says otherwise.
    fireEvent.click(trigger());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("listbox")).toBeNull();

    rerender(
      <HyperliquidAssetPicker
        assets={assets}
        prices={prices}
        contexts={contexts}
        selected="BTC"
        onSelect={() => {}}
        loading={false}
        open
        onOpenChange={onOpenChange}
      />
    );
    expect(screen.queryByRole("listbox")).not.toBeNull();
  });

  it("lets a controlled caller close it without remounting the picker", () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(false)}>
            close from outside
          </button>
          <HyperliquidAssetPicker
            assets={assets}
            prices={prices}
            contexts={contexts}
            selected="BTC"
            onSelect={() => {}}
            loading={false}
            open={open}
            onOpenChange={setOpen}
          />
        </>
      );
    }

    render(<Harness />);
    const button = trigger();
    fireEvent.click(button);
    expect(screen.queryByRole("listbox")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "close from outside" }));

    expect(screen.queryByRole("listbox")).toBeNull();
    // Same DOM node: the caller closed the menu, it did not replace the picker.
    expect(trigger()).toBe(button);
  });

  it("still owns its own open state when no caller controls it", () => {
    renderPicker();
    fireEvent.click(trigger());
    expect(screen.queryByRole("listbox")).not.toBeNull();
    fireEvent.click(trigger());
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("exposes the market list as a labelled listbox of options", () => {
    renderPicker();
    fireEvent.click(trigger());

    const listbox = screen.getByRole("listbox", { name: /market/i });
    const options = within(listbox).getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options.map((option) => option.getAttribute("aria-selected"))).toEqual([
      "true",
      "false",
    ]);
    expect(searchField()).toBeInTheDocument();
  });

  it("picks the market a row names", () => {
    const onSelect = vi.fn();
    renderPicker({ onSelect });
    fireEvent.click(trigger());

    const listbox = screen.getByRole("listbox", { name: /market/i });
    fireEvent.click(within(listbox).getByRole("option", { name: /ETH-USDC/ }));

    expect(onSelect).toHaveBeenCalledWith("ETH");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("shows an unavailable dash, never a zero, for figures the venue did not publish", () => {
    renderPicker({
      contexts: [
        makeContext("BTC", { fundingRate: "", dayVolumeUsd: "", openInterest: "" }),
        makeContext("ETH", { markPrice: "3200", fundingRate: "n/a", dayVolumeUsd: "not-a-number" }),
      ],
    });
    fireEvent.click(trigger());

    const listbox = screen.getByRole("listbox", { name: /market/i });
    const text = listbox.textContent ?? "";
    expect(text).not.toContain("0.0000%");
    expect(text).not.toContain("$0");
    expect(text).not.toContain("NaN");

    const btcRow = within(listbox).getByRole("option", { name: /BTC-USDC/ });
    expect(btcRow.textContent).toContain("—");
  });

  it("gives every row a 44px touch target on a phone", () => {
    renderPicker();
    fireEvent.click(trigger());

    const options = within(screen.getByRole("listbox", { name: /market/i })).getAllByRole("option");
    for (const option of options) {
      expect(option.className).toContain("max-sm:min-h-11");
    }
  });

  it("draws the trigger at the comp's phone size without touching the desktop one", () => {
    renderPicker();
    const button = trigger();

    // The comp's pair pill: 36px tall, 10px horizontal padding, 15px radius,
    // 13px text.
    const markup = button.outerHTML;
    for (const rule of [
      "max-sm:h-9",
      "max-sm:px-2.5",
      "max-sm:rounded-[15px]",
      "max-sm:text-[13px]",
    ]) {
      expect(markup).toContain(rule);
    }

    // The desktop sizes stay exactly where they were. Every phone rule is a
    // max-sm: one, so nothing new applies above the breakpoint.
    expect(markup).toContain("text-[16px]");
    const phoneRules = ["h-9", "px-2.5", "rounded-[15px]", "text-[13px]", "hidden", "min-h-11"];
    for (const element of [button, ...Array.from(button.querySelectorAll("div, span"))]) {
      for (const token of element.className.split(/\s+/).filter(Boolean)) {
        expect(phoneRules).not.toContain(token);
      }
    }
  });

  describe("compact dropdown width", () => {
    // Regression coverage for the phone bug: the compact dropdown used to
    // take the trigger's own measured width verbatim, which on a phone is a
    // narrow pill nowhere near wide enough for the six-column table inside
    // it, so half the columns scrolled out of view before the user ever
    // touched anything.
    function dropdownBox(): HTMLElement {
      const box = screen.getByRole("listbox", { name: /market/i }).closest(".absolute");
      if (!box) throw new Error("the dropdown box was not found");
      return box as HTMLElement;
    }

    function stubLayout({ triggerLeft, innerWidth }: { triggerLeft: number; innerWidth: number }) {
      const originalInnerWidth = window.innerWidth;
      Object.defineProperty(window, "innerWidth", { configurable: true, value: innerWidth });
      const rectSpy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
        left: triggerLeft,
        right: triggerLeft,
        top: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: triggerLeft,
        y: 0,
        toJSON() {
          return this;
        },
      } as DOMRect);
      return () => {
        rectSpy.mockRestore();
        Object.defineProperty(window, "innerWidth", {
          configurable: true,
          value: originalInnerWidth,
        });
      };
    }

    it("ignores a trigger measurement narrower than the columns need, and uses the comfortable minimum instead", () => {
      const restore = stubLayout({ triggerLeft: 0, innerWidth: 800 });
      try {
        // A 180px trigger pill is what caused the original bug: far
        // narrower than the six-column table it was forced to match.
        renderPicker({ compact: true, dropdownWidth: 180 });
        fireEvent.click(trigger());

        expect(dropdownBox().style.width).toBe("560px");
      } finally {
        restore();
      }
    });

    it("never lets the compact dropdown run past the right edge of the viewport, wherever the trigger sits", () => {
      // The trigger sits 300px in from the left on a 402px-wide phone, so
      // only 86px of room is actually left before the viewport edge (minus
      // the 16px gutter). The dropdown must respect that, not the 560px
      // comfortable minimum, or it would spill off-screen.
      const restore = stubLayout({ triggerLeft: 300, innerWidth: 402 });
      try {
        renderPicker({ compact: true });
        fireEvent.click(trigger());

        expect(dropdownBox().style.width).toBe("86px");
      } finally {
        restore();
      }
    });

    it("honors a wide trigger measurement up to a ceiling, so it never becomes absurdly wide", () => {
      const restore = stubLayout({ triggerLeft: 0, innerWidth: 2000 });
      try {
        renderPicker({ compact: true, dropdownWidth: 900 });
        fireEvent.click(trigger());

        expect(dropdownBox().style.width).toBe("720px");
      } finally {
        restore();
      }
    });

    it("leaves the non-compact dropdown with no width override at all", () => {
      const restore = stubLayout({ triggerLeft: 0, innerWidth: 1440 });
      try {
        renderPicker();
        fireEvent.click(trigger());

        expect(dropdownBox().style.width).toBe("");
        expect(dropdownBox().className).toContain("inset-x-4");
      } finally {
        restore();
      }
    });
  });
});
