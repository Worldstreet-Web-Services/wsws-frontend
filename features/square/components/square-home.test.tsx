import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enMessages from "@/messages/en.json";
import type {
  MarketSquareFeedPage,
  MarketSquareHouse,
  MarketSquareRoom,
  SuggestedProfile,
} from "@/lib/api/market-square";

// The page composes the Square's Home from five reads. Each is mocked at the
// fetcher, so what is under test is the composition: the order, the omission
// of an empty section, and where every "do more" control leads.
const reads = vi.hoisted(() => ({
  fetchLiveStreams: vi.fn(),
  fetchScheduledStreams: vi.fn(),
  fetchDiscoverHouses: vi.fn(),
  fetchSuggestedProfiles: vi.fn(),
  fetchSquareMe: vi.fn(),
  fetchSquareFeed: vi.fn(),
  fetchSquareTopics: vi.fn(),
}));

vi.mock("@/lib/api/market-square", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api/market-square")>()),
  ...reads,
}));

vi.mock("@/lib/market-square", () => ({
  MARKET_SQUARE_HIDDEN: false,
  MARKET_SQUARE_URL: "https://square.test",
  marketSquareHref: (path?: string) =>
    path ? `https://square.test/${path}` : "https://square.test",
}));

const { SquareHome } = await import("./square-home");

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

const host = { id: "u-prince", username: "prince", displayName: "Prince", avatarUrl: null };

const liveRoom: MarketSquareRoom = {
  id: "st-live",
  title: "Base season, who wins",
  description: null,
  status: "live",
  scheduledAt: null,
  startedAt: "2026-09-12T10:00:00.000Z",
  peakViewers: 12,
  likeCount: 3,
  topics: ["crypto"],
  owner: host,
};

const soonRoom: MarketSquareRoom = {
  ...liveRoom,
  id: "st-soon",
  title: "testing coming soon",
  status: "scheduled",
  scheduledAt: "2026-09-14T08:00:00.000Z",
  startedAt: null,
  peakViewers: 0,
};

const people: SuggestedProfile[] = [
  {
    id: "u-prince",
    username: "prince",
    displayName: "Prince",
    avatarUrl: null,
    verification: "verified",
    role: "creator",
    followerCount: 1,
  },
  {
    id: "me-1",
    username: "ogazboiz",
    displayName: "ogazboiz",
    avatarUrl: null,
    verification: "none",
    role: "creator",
    followerCount: 1,
  },
];

const house: MarketSquareHouse = {
  id: "h-1",
  title: "Entitle Men",
  description: "let get started",
  imageUrl: null,
  memberCount: 1,
  members: [host],
};

const feedPage: MarketSquareFeedPage = {
  items: [
    {
      id: "post-1",
      type: "post",
      occurredAt: "2026-09-11T09:36:08.543Z",
      post: {
        id: "post-1",
        authorId: "me-1",
        text: "monthly wrap up",
        mediaUrl: null,
        mediaKind: null,
        thumbnailUrl: null,
        deepLink: null,
        preview: null,
        likeCount: 0,
        commentCount: 0,
        repostCount: 0,
        viewCount: 0,
        likedByMe: false,
        repostedByMe: false,
        createdAt: "2026-09-11T09:36:08.543Z",
        author: {
          id: "me-1",
          username: "ogazboiz",
          displayName: "ogazboiz",
          avatarUrl: null,
          verification: "none",
          role: "creator",
        },
      },
    },
  ],
  nextCursor: null,
};

beforeEach(() => {
  for (const read of Object.values(reads)) read.mockReset();
  reads.fetchLiveStreams.mockResolvedValue([liveRoom]);
  reads.fetchScheduledStreams.mockResolvedValue([soonRoom]);
  reads.fetchDiscoverHouses.mockResolvedValue([house]);
  reads.fetchSuggestedProfiles.mockResolvedValue(people);
  reads.fetchSquareMe.mockResolvedValue({
    id: "me-1",
    username: "ogazboiz",
    displayName: "ogazboiz",
    avatarUrl: null,
    verification: "none",
    role: "creator",
  });
  reads.fetchSquareFeed.mockResolvedValue(feedPage);
  reads.fetchSquareTopics.mockResolvedValue([{ key: "crypto", label: "Crypto" }]);
});

function headings(): string[] {
  return screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent ?? "");
}

const outbound = (link: HTMLElement, href: string) => {
  expect(link).toHaveAttribute("href", href);
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", "noopener noreferrer");
};

describe("SquareHome", () => {
  // Home's own headings, in Home's own order and words.
  it("renders the Square's Home sections in Home's order", async () => {
    render(<SquareHome markets={[]} />, { wrapper });
    await screen.findByText("Base season, who wins");
    await screen.findByText("monthly wrap up");
    expect(headings()).toEqual([
      "Top GistRooms",
      "Make some friends",
      "Coming Soon",
      "Popular Houses",
      "Post For You",
    ]);
  });

  it("omits a section that has nothing, rather than showing an empty shelf", async () => {
    reads.fetchScheduledStreams.mockResolvedValue([]);
    reads.fetchDiscoverHouses.mockResolvedValue([]);
    render(<SquareHome markets={[]} />, { wrapper });
    await screen.findByText("monthly wrap up");
    expect(headings()).toEqual(["Top GistRooms", "Make some friends", "Post For You"]);
  });

  it("labels a room's topic from the Square's vocabulary", async () => {
    render(<SquareHome markets={[]} />, { wrapper });
    await screen.findByText("Base season, who wins");
    // Once on the live room, once on the coming-soon room.
    expect(await screen.findAllByText("Crypto")).toHaveLength(2);
  });

  it("sends the reader to the Square for everything this app does not back", async () => {
    render(<SquareHome markets={[]} />, { wrapper });
    await screen.findByText("monthly wrap up");

    outbound(screen.getByRole("link", { name: "Open the Square" }), "https://square.test");
    outbound(
      screen.getByRole("link", { name: "Join Gistroom" }),
      "https://square.test/live/st-live"
    );
    outbound(screen.getByRole("link", { name: "Remind me" }), "https://square.test/live/st-soon");
    outbound(screen.getByRole("link", { name: "Join House" }), "https://square.test/houses/h-1");
    // Home's banner and its search row, carried over.
    for (const host of screen.getAllByRole("link", { name: "Host Room" })) {
      outbound(host, "https://square.test/gist-rooms?open=1");
    }
    expect(
      screen.getByRole("searchbox", { name: "Search Gistrooms, houses, friends" })
    ).toBeInTheDocument();

    // Each section's "View more" continues on the Square's matching page.
    const more = screen.getAllByRole("link", { name: "View more" });
    expect(more.map((link) => link.getAttribute("href"))).toEqual([
      "https://square.test/gist-rooms",
      "https://square.test/pals",
      "https://square.test/gist-rooms",
      "https://square.test/houses",
      "https://square.test/feed",
    ]);
    for (const link of more) outbound(link, link.getAttribute("href") ?? "");

    const person = screen.getByRole("article", { name: "Prince" });
    outbound(
      within(person).getByRole("link", { name: "Wink at Prince" }),
      "https://square.test/u/prince"
    );
    outbound(within(person).getByRole("link", { name: "Prince" }), "https://square.test/u/prince");

    outbound(
      screen.getByRole("link", { name: enMessages.square.openPost }),
      "https://square.test/p/post-1"
    );
  });

  // The deck is people to meet; the reader is not one of them.
  it("leaves the reader out of Make some friends", async () => {
    render(<SquareHome markets={[]} />, { wrapper });
    await screen.findByText("monthly wrap up");
    expect(screen.getByRole("article", { name: "Prince" })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "ogazboiz" })).toBeNull();
  });

  // Following is backed here, so it stays a button on the person's card
  // rather than a trip to the Square.
  it("keeps follow in this app", async () => {
    render(<SquareHome markets={[]} />, { wrapper });
    await screen.findByText("monthly wrap up");
    const person = screen.getByRole("article", { name: "Prince" });
    expect(within(person).getByRole("button", { name: "Follow Prince" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  // Passing takes the card off the rail for this visit, as on the Square's
  // deck. With nobody left the section goes with it.
  it("takes a passed person off the rail", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<SquareHome markets={[]} />, { wrapper });
    await screen.findByText("monthly wrap up");
    fireEvent.click(screen.getByRole("button", { name: "Skip Prince" }));
    expect(screen.queryByRole("article", { name: "Prince" })).toBeNull();
    expect(headings()).not.toContain("Make some friends");
  });
});

// The page follows the rail's switch and nothing else: a hidden square has
// no page, the same way it has no rail entry. It does not read the
// portfolio's SQUARE_SECTIONS_HIDDEN.
describe("SquareHome while the square is hidden", () => {
  it("renders nothing", async () => {
    vi.resetModules();
    vi.doMock("@/lib/market-square", () => ({
      MARKET_SQUARE_HIDDEN: true,
      SQUARE_SECTIONS_HIDDEN: true,
      MARKET_SQUARE_URL: "https://square.test",
      marketSquareHref: () => "https://square.test",
    }));
    const { SquareHome: Hidden } = await import("./square-home");
    const { container } = render(<Hidden markets={[]} />, { wrapper });
    expect(container).toBeEmptyDOMElement();
    expect(reads.fetchLiveStreams).not.toHaveBeenCalled();
  });
});
