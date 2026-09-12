import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import {
  FeedCard,
  GoLiveCard,
  SquareCard,
} from "@/features/discovery/components/conversation-cards";

function wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {children}
    </NextIntlClientProvider>
  );
}

function renderWithIntl(ui: ReactNode) {
  return render(<>{ui}</>, { wrapper });
}

const link = (name: RegExp) => screen.getByRole("link", { name });

// The card is now the event's poster rather than the band's shared frame, so
// the copy it used to carry — the kicker, the headline, the pot and the clock
// — is gone and the wordmark is all it says. What survives is where the pill
// goes, which is the only thing on this card that ever depended on the feed.
describe("Market Square card", () => {
  const home = "https://square.example";

  it("opens the live room and the square in new tabs", () => {
    renderWithIntl(
      <SquareCard
        room={{
          id: "r1",
          title: "Base season, who wins",
          host: "Ada",
          avatars: ["https://cdn.example/ada.png"],
          href: `${home}/live/r1`,
        }}
        avatars={["https://cdn.example/ada.png"]}
        homeHref={home}
      />
    );
    expect(screen.getByText("Base season, who wins")).toBeInTheDocument();
    expect(screen.getByText("Live with Ada")).toBeInTheDocument();
    const join = link(/Join live/);
    expect(join).toHaveAttribute("href", `${home}/live/r1`);
    expect(join).toHaveAttribute("target", "_blank");
    expect(join).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("invites the reader in when no room is live, faces from the design", () => {
    const { container } = renderWithIntl(<SquareCard room={null} avatars={[]} homeHref={home} />);
    expect(screen.getByText("Live rooms on Market Square, all day")).toBeInTheDocument();
    const open = link(/Open Square/);
    expect(open).toHaveAttribute("href", home);
    expect(open).toHaveAttribute("target", "_blank");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(container.querySelector('img[src="/market/convo-avatar-4.png"]')).not.toBeNull();
  });
});

describe("Go live card", () => {
  const home = "https://square.example";

  it("sends both pills to Square, in a new tab", () => {
    renderWithIntl(<GoLiveCard homeHref={home} />);
    expect(screen.getByText(enMessages.discovery.goLiveHeadline)).toBeInTheDocument();
    const start = link(/Start a room/);
    expect(start).toHaveAttribute("href", home);
    expect(start).toHaveAttribute("target", "_blank");
    expect(start).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});

describe("Feed card", () => {
  const home = "https://square.example";

  it("sends both pills to Square, in a new tab", () => {
    renderWithIntl(<FeedCard homeHref={home} />);
    expect(screen.getByText(enMessages.discovery.feedHeadline)).toBeInTheDocument();
    const open = link(/Open the feed/);
    expect(open).toHaveAttribute("href", home);
    expect(open).toHaveAttribute("target", "_blank");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
