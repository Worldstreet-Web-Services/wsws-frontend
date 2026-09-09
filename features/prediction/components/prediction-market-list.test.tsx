import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import enMessages from "@/messages/en.json";
import type { Prediction } from "@/lib/types";

// The real catalogue, not a stand-in: a key dropped from messages/*.json has to
// fail this suite rather than pass it. The pill labels that used to be supplied
// here have landed in messages, so the local override is gone.
const messages = enMessages;

const feed = vi.hoisted(() => ({
  data: undefined as Prediction[] | undefined,
  isPending: false,
  isError: false,
  refetch: vi.fn(),
}));
vi.mock("@/features/prediction/hooks/use-predictions", () => ({
  usePredictions: () => feed,
}));

const access = vi.hoisted(() => ({ allowed: true, country: null, loading: false }));
vi.mock("@/features/prediction/hooks/use-polymarket-access", () => ({
  usePolymarketAccess: () => access,
}));

// The money layer, stood in so the suite can prove which number reaches it and
// that the component never formats an amount itself.
const money = vi.hoisted(() => ({
  format: vi.fn((usd: number) => `NGN ${usd}`),
  formatExact: vi.fn((usd: number) => `NGN ${usd}.00`),
  ready: true,
  currency: { code: "NGN", symbol: "₦" },
  setCurrency: vi.fn(),
}));
vi.mock("@/components/ui/currency-select", () => ({
  useMoney: () => money,
}));

// The bet flow is its own component with its own suite. Stubbed here so this
// suite can see which market and side a pill hands it.
const bet = vi.hoisted(() => ({
  last: null as { prediction: Prediction | null; side: string } | null,
}));
vi.mock("@/features/prediction/components/bet-modal", () => ({
  BetModal: (props: { prediction: Prediction | null; side: string; onClose: () => void }) => {
    bet.last = props;
    return props.prediction ? <div data-testid="bet-modal">{props.side}</div> : null;
  },
}));

import { PredictionMarketList } from "@/features/prediction/components/prediction-market-list";

function market(over: Partial<Prediction> = {}): Prediction {
  return {
    tag: "Politics",
    vol: "$4.2M vol",
    volumeUsd: 4_200_000,
    q: "Will the US cut rates before Q4 2026?",
    yes: "68¢",
    no: "32¢",
    pct: 68,
    image: "https://polymarket-upload.s3.amazonaws.com/fed.png",
    endsAt: "2027-02-22T12:00:00Z",
    eventId: "12345",
    tagLabels: ["Politics"],
    ...over,
  };
}

function renderList() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PredictionMarketList />
    </NextIntlClientProvider>
  );
}

function questionLink() {
  return screen.getByRole("link", { name: market().q });
}

beforeEach(() => {
  feed.data = [market()];
  feed.isPending = false;
  feed.isError = false;
  feed.refetch.mockClear();
  access.allowed = true;
  access.loading = false;
  money.format.mockClear();
  bet.last = null;
});

describe("PredictionMarketList, opening a market", () => {
  it("links the question at the href the category map builds", () => {
    renderList();
    expect(questionLink()).toHaveAttribute(
      "href",
      "/prediction/markets/12345?category=politics&source=markets"
    );
  });

  // A market whose tags name no category this app has cannot be linked. A card
  // that does not open beats a card that opens the wrong screen.
  it("renders the question as plain text when the market has no destination", () => {
    feed.data = [market({ tagLabels: ["Weather"] })];
    renderList();

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(market().q)).toBeInTheDocument();
  });

  it("keeps the whole card pressable: the link opts out of the click ripple", () => {
    // click-ripple.tsx sets `position: relative` on a statically positioned
    // anchor at pointerdown so it can host its ripple layer. That makes the
    // anchor the containing block for its own stretched ::after, which collapses
    // from the whole card to the text box between pointerdown and mouseup, so
    // the press lands on nothing. Measured on the desktop card: 325x210 -> 218x18.
    renderList();
    expect(questionLink()).toHaveAttribute("data-no-ripple");
  });

  it("keeps the line clamp inside the link, never on an ancestor", () => {
    // `line-clamp` is `overflow: hidden`, and hidden overflow on an ancestor
    // clips the stretched ::after back to the text box.
    renderList();
    const link = questionLink();

    expect(link.querySelector("[class*='line-clamp']")).not.toBeNull();
    expect(link.closest("[class*='line-clamp']")).toBeNull();
  });

  // The stretched ::after is positioned against the nearest positioned
  // ancestor. If anything between the card root and the link is positioned, the
  // hit area shrinks to that box instead of covering the card.
  it("puts no positioned element between the card root and the link", () => {
    renderList();
    const card = screen.getByRole("article");
    let node = questionLink().parentElement;
    while (node && node !== card) {
      expect(node.className).not.toMatch(/(^|\s)(relative|absolute|fixed|sticky)(\s|$)/);
      node = node.parentElement;
    }
    expect(card.className).toMatch(/(^|\s)relative(\s|$)/);
  });
});

describe("PredictionMarketList, the outcome pills", () => {
  it("keeps both pills outside the link so a tap on one does not navigate", () => {
    renderList();
    const link = questionLink();
    const yes = screen.getByRole("button", { name: /Yes/ });
    const no = screen.getByRole("button", { name: /No/ });

    expect(link).not.toContainElement(yes);
    expect(link).not.toContainElement(no);
    // An anchor around a button is invalid markup and browsers drop the button
    // out of the tab order when it happens.
    expect(yes.closest("a")).toBeNull();
    expect(no.closest("a")).toBeNull();
  });

  it("opens the bet flow for the side that was tapped", () => {
    renderList();
    expect(screen.queryByTestId("bet-modal")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Yes/ }));
    expect(bet.last?.prediction?.q).toBe(market().q);
    expect(bet.last?.side).toBe("yes");

    fireEvent.click(screen.getByRole("button", { name: /No/ }));
    expect(bet.last?.side).toBe("no");
  });

  it("gives every pill a 44px minimum hit area", () => {
    renderList();
    for (const pill of screen.getAllByRole("button")) {
      expect(pill.className, pill.textContent ?? "").toMatch(/min-h-\[44px\]/);
      expect(pill.className, pill.textContent ?? "").toMatch(/min-w-\[44px\]/);
    }
  });

  // Green and red carry the meaning in the comp. A pill has to say which side
  // it is in words as well, and name the market it belongs to.
  it("names each pill in words and ties it to the market question", () => {
    renderList();
    const card = screen.getByRole("article");
    const question = within(card).getByText(market().q);

    for (const pill of within(card).getAllByRole("button")) {
      expect(pill.textContent?.trim()).not.toBe("");
      expect(pill.getAttribute("aria-describedby")).toBe(question.closest("[id]")?.id);
    }
  });

  it("shows the standing price for each side from the feed", () => {
    renderList();
    expect(screen.getByText("68¢")).toBeInTheDocument();
    expect(screen.getByText("32¢")).toBeInTheDocument();
  });
});

describe("PredictionMarketList, the footer strip", () => {
  it("shows volume through the money layer and never the feed's dollar string", () => {
    renderList();

    expect(money.format).toHaveBeenCalledWith(4_200_000);
    expect(screen.getByText("NGN 4200000")).toBeInTheDocument();
    expect(screen.queryByText(/\$4\.2M/)).not.toBeInTheDocument();
  });

  it("omits volume entirely when the feed states none", () => {
    feed.data = [market({ volumeUsd: undefined })];
    renderList();

    expect(money.format).not.toHaveBeenCalled();
    // A market that reports nothing must not read as one that traded nothing.
    expect(screen.queryByTestId("market-volume")).not.toBeInTheDocument();
  });

  // The date is the reader's locale order, not the comp's British "22nd Feb",
  // and it is rendered in UTC so the server's first paint and the client's
  // hydration name the same day.
  it("shows the real deadline from the feed", () => {
    renderList();
    expect(screen.getByTestId("market-ends")).toHaveTextContent("Closes Feb 22");
  });

  it("shows no deadline at all when the feed carries none", () => {
    feed.data = [market({ endsAt: undefined })];
    renderList();
    expect(screen.queryByTestId("market-ends")).not.toBeInTheDocument();
  });

  it("shows no deadline when the feed's date cannot be parsed", () => {
    feed.data = [market({ endsAt: "not a date" })];
    renderList();
    expect(screen.queryByTestId("market-ends")).not.toBeInTheDocument();
  });

  // The comp's "7.1k Trades" is sample data. The feed publishes no trade count,
  // so the element is absent rather than invented.
  it("never renders a trade count", () => {
    renderList();
    expect(screen.queryByTestId("market-trades")).not.toBeInTheDocument();
    expect(screen.queryByText(/Trades/i)).not.toBeInTheDocument();
  });
});

describe("PredictionMarketList, its states", () => {
  it("shows placeholder cards while the feed is loading", () => {
    feed.data = undefined;
    feed.isPending = true;
    renderList();

    expect(screen.getAllByTestId("market-skeleton").length).toBeGreaterThan(0);
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("shows the catalogue's error copy with a working retry", () => {
    feed.data = undefined;
    feed.isError = true;
    renderList();

    expect(screen.getByText("Couldn't load prediction markets.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(feed.refetch).toHaveBeenCalled();
  });

  it("shows the catalogue's empty copy when the feed is open but bare", () => {
    feed.data = [];
    renderList();

    expect(screen.getByText("No prediction markets are open right now.")).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  // The region gate is about money: a blocked user must not be offered a pill
  // that cannot place an order.
  it("replaces the list with the region notice where prediction is not offered", () => {
    access.allowed = false;
    renderList();

    expect(screen.getByText("Not available in your region")).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Yes/ })).not.toBeInTheDocument();
  });
});
