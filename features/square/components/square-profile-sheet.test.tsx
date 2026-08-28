import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SquareProfileSheet } from "./square-profile-sheet";
import type { MarketSquareAuthor, MarketSquareFeedItem } from "@/lib/api/market-square";

// The labels themselves are not what is under test.
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

vi.mock("@/lib/square/links", () => ({
  squareLinks: {
    profile: (username: string) => `https://square.test/u/${username}`,
  },
}));

// The card is its own tested surface; here it only needs to be countable.
vi.mock("@/features/square/components/square-post-card", () => ({
  SquarePostCard: ({ post }: { post: { id: string } }) => (
    <div data-testid="profile-post">{post.id}</div>
  ),
}));

vi.mock("@/features/square/components/follow-button", () => ({
  FollowButton: () => <button type="button">follow</button>,
}));

const AUTHOR: MarketSquareAuthor = {
  id: "did:privy:author-1",
  username: "trader_one",
  displayName: "Trader One",
  avatarUrl: null,
  verification: "verified",
  role: "citizen",
};

function feedItem(id: string, authorId: string): MarketSquareFeedItem {
  return {
    id: `item-${id}`,
    type: "post",
    occurredAt: "2026-08-28T00:00:00Z",
    post: {
      id,
      authorId,
      text: "hello",
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
      createdAt: "2026-08-28T00:00:00Z",
      author: {
        ...AUTHOR,
        id: authorId,
        username: authorId === AUTHOR.id ? AUTHOR.username : "someone_else",
      },
    },
  };
}

vi.mock("@/lib/api/market-square", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/market-square")>();
  return {
    ...original,
    fetchSquareFeed: vi.fn(async () => ({
      items: [
        feedItem("post-a", "did:privy:author-1"),
        feedItem("post-b", "did:privy:someone-else"),
        feedItem("post-c", "did:privy:author-1"),
      ],
      nextCursor: null,
    })),
    fetchSuggestedProfiles: vi.fn(async () => [
      {
        id: "did:privy:author-1",
        username: "trader_one",
        displayName: "Trader One",
        avatarUrl: null,
        verification: "verified",
        role: "citizen",
        followerCount: 412,
      },
    ]),
  };
});

vi.mock("@/lib/market-square", () => ({
  MARKET_SQUARE_URL: "https://square.test",
  marketSquareHref: (path: string) => `https://square.test/${path}`,
}));

function renderSheet() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SquareProfileSheet author={AUTHOR} markets={[]} onClose={() => {}} />
    </QueryClientProvider>
  );
}

describe("SquareProfileSheet", () => {
  it("shows the identity it was opened with", async () => {
    renderSheet();
    expect(await screen.findByText("Trader One")).toBeTruthy();
    expect(screen.getByText("@trader_one")).toBeTruthy();
  });

  it("shows only the author's posts from the feed", async () => {
    renderSheet();
    const cards = await screen.findAllByTestId("profile-post");
    // post-b belongs to someone else and must not appear as theirs.
    expect(cards.map((card) => card.textContent)).toEqual(["post-a", "post-c"]);
  });

  it("shows the directory's follower count when the person is ranked", async () => {
    renderSheet();
    expect(await screen.findByText("followersCount")).toBeTruthy();
  });

  it("hands over to the square for the full profile", async () => {
    renderSheet();
    const link = (await screen.findByText("profileOpenSquare")) as HTMLAnchorElement;
    expect(link.closest("a")?.getAttribute("href")).toBe("https://square.test/u/trader_one");
  });

  it("never reads a failed feed as an empty history", async () => {
    const api = await import("@/lib/api/market-square");
    vi.mocked(api.fetchSquareFeed).mockRejectedValueOnce(new Error("down"));
    renderSheet();
    // The identity still shows; the posts area shows an error, not the
    // definitive "nothing from them" empty state.
    await screen.findByText("Trader One");
    expect(screen.queryByText("profileNothingRecent")).toBeNull();
  });
});
