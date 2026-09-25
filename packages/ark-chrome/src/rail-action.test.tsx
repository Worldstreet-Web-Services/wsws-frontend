import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ArkRailAction } from "./rail-action";

// Every class the button carries must be one the package's stylesheet draws.
// A class string that runs two names together matches no selector, and the
// row falls back to an unstyled browser button.
const STYLED_CLASSES = new Set(
  [
    ...readFileSync(join(import.meta.dirname, "styles.css"), "utf8").matchAll(
      /\.(ark-chrome-[\w-]+)/g
    ),
  ].map((m) => m[1])
);

function classesOf(el: Element): string[] {
  return el.className.split(/\s+/).filter(Boolean);
}

describe("ArkRailAction", () => {
  it("draws the resting row with the rail action's styled class", () => {
    render(<ArkRailAction label="Go Live" onPress={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Go Live" });
    expect(classesOf(button)).toEqual(["ark-chrome-rail-action"]);
    expect(button).not.toHaveAttribute("data-live");
  });

  it("keeps the row's own look and adds the on-air look while live", () => {
    render(<ArkRailAction label="Live" live onPress={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Live" });
    expect(classesOf(button)).toEqual(["ark-chrome-rail-action", "ark-chrome-rail-action--live"]);
    expect(button).toHaveAttribute("data-live");
    for (const name of classesOf(button)) expect(STYLED_CLASSES).toContain(name);
  });

  it("reports a press", () => {
    const onPress = vi.fn();
    render(<ArkRailAction label="Live" live onPress={onPress} />);
    fireEvent.click(screen.getByRole("button", { name: "Live" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
