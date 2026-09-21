// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { MigrationGateHeader } from "@/features/migrate/components/migration-gate-header";

/*
  One modal, two doors. The gate opens it on first arrival; "Finish upgrading my
  old account" in the account menu reopens the SAME modal for somebody halfway
  through. Only the words differ, because "Upgrade your account" to a reader
  who has already started reads as the upgrade having begun again.
*/
describe("the upgrade modal's header", () => {
  /*
    On first arrival the announcement IS the headline — "New economy
    unveiling." — and "Upgrade your account" sits above it, small.
  */
  it("headlines the announcement on first arrival, with the task above it", () => {
    render(<MigrationGateHeader stage="signIn" done={false} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("gateEyebrow");
    const small = screen.getByText("gateTitle");
    expect(small.tagName).toBe("P");
    expect(screen.getByText("gateIntro")).toBeInTheDocument();
  });

  it("says finish, not start, when reopened from the account menu", () => {
    render(<MigrationGateHeader stage="move" done={false} variant="finish" />);
    expect(screen.getByText("gateFinishEyebrow")).toBeInTheDocument();
    // Nothing to announce by now: the task takes the headline.
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("gateFinishTitle");
    expect(screen.getByText("gateFinishIntro")).toBeInTheDocument();
    expect(screen.queryByText("gateTitle")).toBeNull();
  });

  // The steps are the same modal's steps whichever door was used.
  it("shows the same three steps in both", () => {
    for (const variant of ["gate", "finish"] as const) {
      const { unmount } = render(
        <MigrationGateHeader stage="move" done={false} variant={variant} />
      );
      for (const step of ["gateStepSignIn", "gateStepMove", "gateStepFinish"]) {
        expect(screen.getByText(step)).toBeInTheDocument();
      }
      unmount();
    }
  });

  it("marks the step in hand for assistive tech", () => {
    render(<MigrationGateHeader stage="move" done={false} />);
    const current = screen.getByText("gateStepMove").closest("li");
    expect(current).toHaveAttribute("aria-current", "step");
  });

  /*
    The colour is spent on meaning. Progress is the reader's own doing, so the
    rail is solid upgrade gold (#feda4b) — no gradient, which read muddy on this dark sheet —
    and the title stays white.
  */
  it("fills the rail in solid gold, not a gradient or the old silver", () => {
    const { container } = render(<MigrationGateHeader stage="move" done={false} />);
    const fills = container.querySelectorAll("li > div > div");
    expect(fills.length).toBe(3);
    for (const fill of fills) {
      expect(fill.className).toContain("bg-upgrade");
      expect(fill.className).not.toContain("gradient");
      expect(fill.className).not.toContain("bg-accent");
    }
  });
});
