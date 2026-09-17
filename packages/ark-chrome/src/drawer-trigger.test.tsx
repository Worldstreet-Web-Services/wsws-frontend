import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ArkDrawerTrigger, ArkSidebar } from "./index";
import type { ChromeLinkProps } from "./types";

// Below 768px the rail is a drawer the host opens. The tab bar has no menu
// seat, so the control that opens the drawer is this button, rendered by the
// host wherever its drawer opens from (a phone top bar, the perps header).

const STYLES = readFileSync(join(import.meta.dirname, "styles.css"), "utf8");

function HostLink({ href, children, ...rest }: ChromeLinkProps) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

let sheet: HTMLStyleElement;

beforeEach(() => {
  sheet = document.createElement("style");
  sheet.textContent = STYLES;
  document.head.appendChild(sheet);
});

afterEach(() => {
  sheet.remove();
});

describe("ArkDrawerTrigger", () => {
  it("is a named button that says whether the drawer is open and which drawer it opens", () => {
    const { rerender } = render(<ArkDrawerTrigger open={false} onPress={() => {}} label="Menu" />);
    const button = screen.getByRole("button", { name: "Menu" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", "ark-chrome-sidebar");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");

    rerender(<ArkDrawerTrigger open onPress={() => {}} label="Menu" controls="app-sidebar" />);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveAttribute("aria-controls", "app-sidebar");
  });

  it("controls the drawer the sidebar renders", () => {
    render(
      <>
        <ArkDrawerTrigger
          open={false}
          onPress={() => {}}
          label="Open menu"
          controls="app-sidebar"
        />
        <ArkSidebar
          id="app-sidebar"
          items={[]}
          activeId={null}
          Link={HostLink}
          brand={{ target: { kind: "link", href: "/" } }}
          person={{ status: "loading" }}
          drawer={{ open: false, onClose: () => {} }}
          labels={{ menu: "Menu", closeMenu: "Close menu" }}
        />
      </>
    );
    const controls = screen
      .getByRole("button", { name: "Open menu" })
      .getAttribute("aria-controls");
    expect(document.getElementById(controls ?? "")?.tagName).toBe("ASIDE");
  });

  it("reports presses to the host, which owns the open state", () => {
    const onPress = vi.fn();
    render(<ArkDrawerTrigger open={false} onPress={onPress} label="Menu" />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("hands the host its button, for focus, and takes the host's placement class", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <ArkDrawerTrigger ref={ref} open={false} onPress={() => {}} label="Menu" className="mb-4" />
    );
    const button = screen.getByRole("button", { name: "Menu" });
    expect(ref.current).toBe(button);
    expect(button.className).toContain("ark-chrome-drawer-trigger");
    expect(button.className).toContain("mb-4");
  });

  it("is drawn as the perps menu button: a 36px ring, dim at rest", () => {
    render(<ArkDrawerTrigger open={false} onPress={() => {}} label="Menu" />);
    const style = getComputedStyle(screen.getByRole("button", { name: "Menu" }));
    expect(style.width).toBe("36px");
    expect(style.height).toBe("36px");
    expect(style.display).toBe("grid");
    expect(style.borderTopWidth).toBe("1px");
    expect(style.cursor).toBe("pointer");

    const rule = /\n\.ark-chrome-drawer-trigger \{([^}]*)\}/.exec(STYLES)?.[1] ?? "";
    expect(rule).toMatch(
      /border-color: color-mix\(in oklab, var\(--ark-chrome-white, #fff\) 10%, transparent\);/
    );
    expect(rule).toMatch(
      /color: color-mix\(in oklab, var\(--ark-chrome-white, #fff\) 60%, transparent\);/
    );
    // No margin and no opacity: the host places the button, and WSWS's own
    // press feedback (opacity on hover under reduced motion) still reaches it.
    expect(rule).not.toMatch(/\bmargin\b|\bopacity\b/);
  });

  it("brightens its ring and glyph on hover, only where hover exists", () => {
    const hover = [...STYLES.matchAll(/@media \(hover: hover\)\s*\{([\s\S]*?)\n\}/g)]
      .map((m) => m[1])
      .join("\n");
    const rule = /\.ark-chrome-drawer-trigger:hover\s*\{([^}]*)\}/.exec(hover)?.[1] ?? "";
    expect(rule).toMatch(
      /border-color: color-mix\(in oklab, var\(--ark-chrome-white, #fff\) 25%, transparent\);/
    );
    expect(rule).toMatch(/color: #fff;/);
  });
});
