import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import type { Prediction } from "@/lib/types";
import { PredictionMobile } from "./prediction-mobile";

const refetch = vi.fn();
const usePredictions = vi.fn();
const format = vi.fn((usd: number) => `NGN ${usd}`);

vi.mock("@/features/prediction/hooks/use-predictions", () => ({
  usePredictions: () => usePredictions(),
}));

// The money layer, stubbed at its own boundary: the card hands it a dollar
// amount and shows what it gets back, rather than converting on its own.
vi.mock("@/components/ui/currency-select", () => ({
  useMoney: () => ({
    currency: { code: "NGN", name: "Nigerian Naira", symbol: "₦", region: "Africa" },
    setCurrency: vi.fn(),
    ready: true,
    format,
    formatExact: format,
  }),
}));

// Every string the card draws resolves from the real English catalogue.
const messages = enMessages;

const NOW = Date.UTC(2026, 1, 20, 12, 0, 0);

const rates: Prediction = {
  tag: "Politics",
  vol: "$4.2M vol",
  volumeUsd: 4_200_000,
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
  volumeUsd: 2_800_000,
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

function renderCard() {
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

// The card is the Figma SVG, patched. Its <object> is the one element that
// carries the market on screen, through its accessible label.
function card(): HTMLObjectElement | null {
  return document.querySelector("object");
}

beforeEach(() => {
  reducedMotion = false;
  stubMatchMedia();
  refetch.mockReset();
  format.mockClear();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PredictionMobile", () => {
  it("heads the section with a link through to the prediction hub", () => {
    mockFeed({ data: [rates] });
    renderCard();

    const heading = screen.getByRole("link", { name: /Your Next Prediction Starts Here/ });
    expect(heading).toHaveAttribute("href", "/prediction");
  });

  it("draws the market as the Figma card SVG, labelled with its own question", () => {
    mockFeed({ data: [rates] });
    renderCard();

    const object = card();
    expect(object).not.toBeNull();
    expect(object).toHaveAttribute("data", "/prediction/card-bg.svg");
    expect(object).toHaveAttribute("aria-label", rates.q);
    // The SVG carries its own <a>, so the object cannot take the tap itself.
    expect(object?.className).toContain("pointer-events-none");
  });

  it("opens the market from the card, through the wrapping link", () => {
    mockFeed({ data: [rates] });
    renderCard();

    const link = card()?.closest("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toMatch(/^\/prediction/);
  });

  it("converts the volume through the money layer, not on its own", () => {
    mockFeed({ data: [rates] });
    renderCard();

    // The dollar amount goes to the money layer; the card never touches a rate.
    expect(format).toHaveBeenCalledWith(4_200_000);
  });

  it("asks the money layer for nothing when the feed carries no volume", () => {
    mockFeed({ data: [{ ...rates, volumeUsd: undefined }] });
    renderCard();

    expect(format).not.toHaveBeenCalled();
  });

  it("advances to the next market every ten seconds and loops back", () => {
    mockFeed({ data: [rates, btc] });
    renderCard();

    expect(card()).toHaveAttribute("aria-label", rates.q);

    tick(9_000);
    expect(card()).toHaveAttribute("aria-label", rates.q);

    tick(1_000);
    expect(card()).toHaveAttribute("aria-label", btc.q);

    tick(10_000);
    expect(card()).toHaveAttribute("aria-label", rates.q);
  });

  it("holds the rotation while a pointer is over the card, and releases it after", () => {
    mockFeed({ data: [rates, btc] });
    const { container } = renderCard();
    const slide = container.querySelector("div.snap-start") as HTMLElement;

    fireEvent.pointerEnter(slide);
    tick(30_000);
    expect(card()).toHaveAttribute("aria-label", rates.q);

    fireEvent.pointerLeave(slide);
    tick(10_000);
    expect(card()).toHaveAttribute("aria-label", btc.q);
  });

  it("holds the rotation while focus is inside the card", () => {
    mockFeed({ data: [rates, btc] });
    const { container } = renderCard();
    const slide = container.querySelector("div.snap-start") as HTMLElement;

    fireEvent.focusIn(slide);
    tick(30_000);
    expect(card()).toHaveAttribute("aria-label", rates.q);
  });

  it("never rotates when the reader asked for reduced motion", () => {
    reducedMotion = true;
    stubMatchMedia();
    mockFeed({ data: [rates, btc] });
    renderCard();

    tick(60_000);
    expect(card()).toHaveAttribute("aria-label", rates.q);
  });

  it("shows a loading state instead of a market while the feed is in flight", () => {
    mockFeed({ isPending: true });
    renderCard();

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(card()).toBeNull();
  });

  it("shows the error state and refetches on demand", () => {
    mockFeed({ isError: true });
    renderCard();

    expect(screen.getByText("Couldn't load prediction markets.")).toBeInTheDocument();
    expect(card()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("invents no market when the feed comes back empty", () => {
    mockFeed({ data: [] });
    renderCard();

    expect(screen.getByText("No prediction markets are open right now.")).toBeInTheDocument();
    expect(card()).toBeNull();
  });

  it("offers the illustrated promo card beside the live market", () => {
    mockFeed({ data: [rates] });
    renderCard();

    const promo = screen.getByRole("link", { name: /Predict Now/ });
    expect(promo).toHaveAttribute("href", "/prediction");
    expect(promo.querySelector('img[src="/prediction/boxing-card.png"]')).not.toBeNull();
  });
});
