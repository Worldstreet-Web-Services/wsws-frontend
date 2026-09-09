import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import type { Prediction } from "@/lib/types";
import { PredictionMobile } from "./prediction-mobile";

const refetch = vi.fn();
const usePredictions = vi.fn();

vi.mock("@/features/prediction/hooks/use-predictions", () => ({
  usePredictions: () => usePredictions(),
}));

// The strings this banner adds are reported for the five catalogs but are not in
// them yet, so the test supplies them alongside the real English messages. Every
// other key resolves from the catalog itself.
const messages = {
  ...enMessages,
  prediction: {
    ...enMessages.prediction,
    mobilePredictNow: "Predict Now",
    mobileMarketsError: "Couldn't load prediction markets.",
    mobileNoMarkets: "No prediction markets are open right now.",
    mobilePauseRotation: "Pause prediction rotation",
    mobileResumeRotation: "Resume prediction rotation",
  },
};

const rates: Prediction = {
  tag: "Politics",
  vol: "$4.2M vol",
  q: "Will the US cut rates before Q4 2026?",
  yes: "68¢",
  no: "32¢",
  pct: 68,
  image: "https://polymarket-upload.s3.amazonaws.com/rates.png",
  eventId: "481717",
  tagLabels: ["Politics"],
};

const btc: Prediction = {
  tag: "Crypto",
  vol: "$2.8M vol",
  q: "Will BTC close above $80k this quarter?",
  yes: "41¢",
  no: "59¢",
  pct: 41,
  image: "https://polymarket-upload.s3.amazonaws.com/btc.png",
  eventId: "481718",
  tagLabels: ["Crypto"],
};

let reducedMotion = false;

function stubMatchMedia() {
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes("prefers-reduced-motion") ? reducedMotion : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia;
}

function mockFeed(result: { data?: Prediction[]; isPending?: boolean; isError?: boolean }): void {
  usePredictions.mockReturnValue({
    data: result.data,
    isPending: result.isPending ?? false,
    isError: result.isError ?? false,
    refetch,
  });
}

function renderBanner() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PredictionMobile />
    </NextIntlClientProvider>
  );
}

function tick(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  reducedMotion = false;
  stubMatchMedia();
  refetch.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PredictionMobile", () => {
  it("draws the market's own question, price, volume, category and artwork", () => {
    mockFeed({ data: [rates] });
    renderBanner();

    expect(screen.getByText(rates.q)).toBeInTheDocument();
    expect(screen.getByText(/68¢/)).toBeInTheDocument();
    expect(screen.getByText("$4.2M vol")).toBeInTheDocument();
    expect(screen.getByText("Politics")).toBeInTheDocument();
    // No page of its own on this build: the banner opens the desk.
    expect(screen.getByRole("link", { name: rates.q })).toHaveAttribute("href", "/prediction");

    const artwork = document.querySelector(`img[src="${rates.image}"]`);
    expect(artwork).not.toBeNull();
  });

  it("renders no baked-in artwork text: the 994KB card SVG is gone", () => {
    mockFeed({ data: [rates] });
    const { container } = renderBanner();

    expect(container.querySelector('[data*="card-bg.svg"]')).toBeNull();
    expect(container.querySelector("object")).toBeNull();
    // The question and the figures the old export carried as vector artwork.
    expect(screen.queryByText(/Benny Hinn/)).not.toBeInTheDocument();
    expect(screen.queryByText(/recommend increasing your position/)).not.toBeInTheDocument();
  });

  it("advances to the next market every ten seconds and loops back", () => {
    mockFeed({ data: [rates, btc] });
    renderBanner();

    expect(screen.getByText(rates.q)).toBeInTheDocument();

    tick(9_000);
    expect(screen.getByText(rates.q)).toBeInTheDocument();

    tick(1_000);
    expect(screen.getByText(btc.q)).toBeInTheDocument();
    expect(screen.queryByText(rates.q)).not.toBeInTheDocument();

    tick(10_000);
    expect(screen.getByText(rates.q)).toBeInTheDocument();
  });

  it("holds the rotation while a pointer is over the card, and releases it after", () => {
    mockFeed({ data: [rates, btc] });
    const { container } = renderBanner();
    const slide = container.querySelector("div.snap-start") as HTMLElement;

    fireEvent.pointerEnter(slide);
    tick(30_000);
    expect(screen.getByText(rates.q)).toBeInTheDocument();

    fireEvent.pointerLeave(slide);
    tick(10_000);
    expect(screen.getByText(btc.q)).toBeInTheDocument();
  });

  it("holds the rotation while focus is inside the card", () => {
    mockFeed({ data: [rates, btc] });
    const { container } = renderBanner();
    const slide = container.querySelector("div.snap-start") as HTMLElement;

    fireEvent.focusIn(slide);
    tick(30_000);
    expect(screen.getByText(rates.q)).toBeInTheDocument();
  });

  it("stops and restarts the rotation from the pause control", () => {
    mockFeed({ data: [rates, btc] });
    renderBanner();

    const pause = screen.getByRole("button", { name: "Pause prediction rotation" });
    expect(pause).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(pause);
    tick(30_000);
    expect(screen.getByText(rates.q)).toBeInTheDocument();

    const resume = screen.getByRole("button", { name: "Resume prediction rotation" });
    expect(resume).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(resume);
    tick(10_000);
    expect(screen.getByText(btc.q)).toBeInTheDocument();
  });

  it("never rotates when the reader asked for reduced motion", () => {
    reducedMotion = true;
    stubMatchMedia();
    mockFeed({ data: [rates, btc] });
    renderBanner();

    tick(60_000);
    expect(screen.getByText(rates.q)).toBeInTheDocument();
    // Nothing moves, so there is nothing to offer a pause control for.
    expect(screen.queryByRole("button", { name: /rotation/ })).not.toBeInTheDocument();
  });

  it("shows no pause control for a single market", () => {
    mockFeed({ data: [rates] });
    renderBanner();

    expect(screen.queryByRole("button", { name: /rotation/ })).not.toBeInTheDocument();
  });

  it("shows a loading state instead of a market while the feed is in flight", () => {
    mockFeed({ isPending: true });
    renderBanner();

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText(rates.q)).not.toBeInTheDocument();
  });

  it("invents no market when the feed comes back empty", () => {
    mockFeed({ data: [] });
    renderBanner();

    expect(screen.getByText("No prediction markets are open right now.")).toBeInTheDocument();
    expect(screen.queryByText(/¢/)).not.toBeInTheDocument();
    expect(screen.queryByText(/vol/)).not.toBeInTheDocument();
    expect(screen.queryByText(rates.q)).not.toBeInTheDocument();
  });

  it("shows the error state and refetches on demand", () => {
    mockFeed({ isError: true });
    renderBanner();

    expect(screen.getByText("Couldn't load prediction markets.")).toBeInTheDocument();
    expect(screen.queryByText(/¢/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
