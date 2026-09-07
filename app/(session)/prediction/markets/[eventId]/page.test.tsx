import { describe, expect, it, vi } from "vitest";
import Page from "./page";

vi.mock("@/features/prediction/sportsbook", () => ({ SportsbookShell: () => null }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not found");
  },
}));

describe("market event routing", () => {
  it.each(["politics", "crypto", "finance", "tech", "culture", "economy"])(
    "routes %s events to category details, not the sportsbook",
    async (category) => {
      const element = await Page({
        params: Promise.resolve({ eventId: "101" }),
        searchParams: Promise.resolve({ category }),
      });
      expect(element.props).toMatchObject({ eventId: "101", category });
      expect(element.props).not.toHaveProperty("requestedSport");
    }
  );

  it("preserves sports links without a category", async () => {
    const element = await Page({
      params: Promise.resolve({ eventId: "101" }),
      searchParams: Promise.resolve({ sport: "tennis", league: "atp" }),
    });
    expect(element.props).toMatchObject({
      eventId: "101",
      requestedSport: "tennis",
      league: "atp",
    });
  });
});
