import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ConversationRow } from "./conversation-row";
import { Next100xRow } from "./next-100x-row";
import { PredictionStartsRow } from "./prediction-starts-row";
import { TokenMovesRow } from "./token-moves-row";

// The rows are editorial: fixed copy, live destinations. So the translator is
// stubbed to echo its key, which keeps the assertions about routing rather than
// about wording that the design may still change. `rich` renders the chunks
// without the markup, the way next-intl does when no tag handler matches.
vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.rich = (key: string) => key;
    return t;
  },
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

/** Every href the row renders, in document order. */
function hrefs(container: HTMLElement): string[] {
  // By role, not by tag: the carousel flanks the real slides with inert,
  // aria-hidden clones so it can loop, and those are not links anyone can reach.
  // Querying the accessible tree counts the destinations a reader actually has.
  return within(container)
    .queryAllByRole("link")
    .map((a) => a.getAttribute("href") ?? "");
}

describe("discovery rows", () => {
  it("sends every token-moves link to a route that exists", () => {
    const { container } = render(<TokenMovesRow />);
    // Heading through to spot, the BTC call, then Eth Africa's buy and its
    // community, which is a prediction desk rather than a square that is off.
    // The BTC call repeats last: the carousel needs a third slide to cycle.
    expect(hrefs(container)).toEqual(["/spot", "/spot", "/spot", "/prediction", "/spot"]);
  });

  it("routes the 100X cards to the meme desk, the only place either trades", () => {
    const { container } = render(<Next100xRow />);
    expect(new Set(hrefs(container))).toEqual(new Set(["/meme"]));
    // Two cards plus the repeated Pepe slide the carousel cycles through.
    expect(hrefs(container)).toHaveLength(4);
  });

  it("routes every prediction card to the prediction desk", () => {
    const { container } = render(<PredictionStartsRow />);
    expect(new Set(hrefs(container))).toEqual(new Set(["/prediction"]));
  });

  /**
   * The design pairs two shelves here and both always render. The room shelf
   * used to be gated on Market Square, but none of its links go there: they all
   * lead to chess, so the square being switched off is no reason to drop it.
   *
   * Each slide carries its own heading, because a heading pinned above a moving
   * card would be describing the wrong card a second after the first advance.
   * The room shelf repeats as the third slide, so its heading appears twice.
   */
  it("shows both shelves, and routes the room into chess and the desk into perps", () => {
    const { container } = render(<ConversationRow />);
    expect(within(container).getAllByRole("link", { name: /conversationTitle/ })).toHaveLength(2);
    expect(within(container).getByRole("link", { name: /ownMarketTitle/ })).toBeInTheDocument();
    expect(hrefs(container)).toEqual([
      "/casino/chess",
      "/casino/chess/watch",
      "/casino/chess",
      "/perps",
      "/perps",
      "/casino/chess",
      "/casino/chess/watch",
      "/casino/chess",
    ]);
  });

  it("gives each shelf a heading that is itself the way through", () => {
    const { container } = render(<TokenMovesRow />);
    const heading = within(container).getByText("tokenMovesTitle");
    expect(heading.closest("a")).toHaveAttribute("href", "/spot");
  });
});
