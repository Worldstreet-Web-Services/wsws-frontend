import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import enMessages from "@/messages/en.json";
import type { Prediction } from "@/lib/types";

// The desk's own neighbours are not under test here: the Local markets, the
// positions list and the bet modal each have suites of their own.
vi.mock("@/features/prediction/components/local-prediction-view", () => ({
  LocalPredictionView: () => <div data-testid="local-markets" />,
}));
vi.mock("@/features/prediction/components/prediction-positions", () => ({
  PredictionPositions: () => null,
}));
vi.mock("@/features/prediction/components/bet-modal", () => ({ BetModal: () => null }));
vi.mock("@/features/prediction/hooks/use-polymarket-positions-controller", () => ({
  usePolymarketPositionsController: () => ({ positions: { refresh: vi.fn() } }),
}));
vi.mock("@/features/prediction/hooks/use-polymarket-access", () => ({
  usePolymarketAccess: () => ({ allowed: true }),
}));

const rates: Prediction = {
  tag: "Politics",
  vol: "$4.2M vol",
  volumeUsd: 4_200_000,
  q: "Will the US cut rates before Q4 2026?",
  yes: "68¢",
  no: "32¢",
  pct: 68,
  image: null,
  eventId: "481717",
  tagLabels: ["Politics"],
};
vi.mock("@/features/prediction/hooks/use-predictions", () => ({
  usePredictions: () => ({ data: [rates] }),
}));

import { PredictionView } from "./prediction-view";

function renderView(showAll = false) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <PredictionView showAll={showAll} />
    </NextIntlClientProvider>
  );
}

const explore = () => screen.queryByRole("link", { name: /Explore all markets/ });

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  );
});

describe("PredictionView", () => {
  it("offers the Explore market on the Polymarket tab", () => {
    renderView();
    expect(explore()).toHaveAttribute("href", "/prediction/markets");
  });

  it("puts the button away on the Local tab, which the Explore market does not list", () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: enMessages.prediction.sourceTab_local }));
    expect(screen.getByTestId("local-markets")).toBeInTheDocument();
    expect(explore()).toBeNull();
  });

  it("does not offer it on the full list", () => {
    renderView(true);
    expect(explore()).toBeNull();
  });

  it("opens each market's own page in the Explore market from its card", () => {
    renderView();
    expect(screen.getByRole("link", { name: rates.q })).toHaveAttribute(
      "href",
      "/prediction/markets/481717?category=politics&source=markets"
    );
  });
});
