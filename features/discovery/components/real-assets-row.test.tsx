import type { ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import { RealAssetsRow } from "@/features/discovery/components/real-assets-row";

beforeAll(() => {
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {children}
    </NextIntlClientProvider>
  );
}

const empty = { gold: [], treasuries: [], realEstate: [], stocks: [] };

function realSlideHeadlines(): string[] {
  return Array.from(document.querySelectorAll("article"))
    .filter((card) => card.closest("[inert]") === null)
    .map((card) => card.querySelector("h3")?.textContent ?? "");
}

describe("Own the Real World", () => {
  it("shows for a reader whose interest maps to Real assets, in the card order", () => {
    for (const interest of ["stocks", "gold", "yield", "realestate", "treasuries"]) {
      const { unmount } = render(<RealAssetsRow interest={interest} spots={empty} />, { wrapper });
      expect(realSlideHeadlines()).toEqual([
        enMessages.discovery.rwaGoldHeadline,
        enMessages.discovery.rwaTreasuriesHeadline,
        enMessages.discovery.rwaRealEstateHeadline,
        enMessages.discovery.rwaStocksHeadline,
      ]);
      unmount();
    }
  });

  it("draws nothing for any other interest, or none", () => {
    for (const interest of ["crypto", "meme", "prediction", "casino", null]) {
      const { container, unmount } = render(<RealAssetsRow interest={interest} spots={empty} />, {
        wrapper,
      });
      expect(container.innerHTML).toBe("");
      unmount();
    }
  });

  it("heads to the Real assets desk", () => {
    render(<RealAssetsRow interest="gold" spots={empty} />, { wrapper });
    expect(screen.getByRole("link", { name: /Own the Real World/ })).toHaveAttribute(
      "href",
      "/rwa"
    );
  });
});
