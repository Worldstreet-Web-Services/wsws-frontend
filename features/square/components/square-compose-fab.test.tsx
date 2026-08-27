import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SquareComposeFab } from "./square-compose-fab";

// next-intl needs a provider; the labels themselves are not what is under test.
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/square/links", () => ({
  squareLinks: {
    home: () => "https://square.test",
    notifications: () => "https://square.test/notifications",
    profile: (u: string) => `https://square.test/u/${u}`,
    post: (id: string) => `https://square.test/p/${id}`,
    live: (id: string) => `https://square.test/live/${id}`,
  },
}));
vi.mock("@/lib/api/market-square", () => ({
  fetchSquareMe: vi.fn().mockResolvedValue(null),
  fetchSquareTopics: vi.fn().mockResolvedValue([]),
  fetchSquareUnread: vi.fn().mockResolvedValue(0),
  createSquarePost: vi.fn(),
}));

function renderFab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SquareComposeFab />
    </QueryClientProvider>
  );
}

/**
 * The plus shipped inert: its sheet was imported but never rendered, so the
 * click set state that nothing read and the button did nothing at all. Type
 * checking cannot catch an unused import, and neither can a lint rule that
 * counts the import as "used". Only pressing it can.
 */
describe("SquareComposeFab", () => {
  it("opens the actions sheet when pressed", () => {
    renderFab();
    // Revealed on scroll; the sheet is what is under test, so force it visible.
    Object.defineProperty(window, "scrollY", { value: 5000, writable: true });
    window.dispatchEvent(new Event("scroll"));

    const plus = screen.getByRole("button", { name: "compose" });
    expect(screen.queryByText("composeTitle")).toBeNull();

    fireEvent.click(plus);
    expect(screen.getByText("composeTitle")).toBeInTheDocument();
  });

  it("renders nothing at all when the square is not configured", async () => {
    vi.resetModules();
    vi.doMock("@/lib/square/links", () => ({ squareLinks: { home: () => null } }));
    const { SquareComposeFab: Unconfigured } = await import("./square-compose-fab");
    const client = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={client}>
        <Unconfigured />
      </QueryClientProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
