import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import {
  MemeMarketMetrics,
  type MemeMarketMetricsData,
  type MemeMarketMetricsProps,
} from "@/features/trade/components/meme-market-metrics";

// The keys this component adds live in messages/*.json, which another change
// owns. Merging them here keeps the test honest about the copy it expects
// while leaving the catalogs to their owner.
const METRIC_MESSAGES = {
  metricsShow: "View Market Metrics",
  metricsHide: "Close Market Metrics",
  metricsRegion: "Market metrics",
  metricsLoading: "Loading market metrics",
  metricsError: "Market metrics couldn't be loaded.",
  metricsRetry: "Try again",
  metricsEmpty: "No market metrics for this coin yet.",
  metricUnavailable: "Unavailable",
  metricMarketCap: "Market Cap",
  metricVolume24h: "Volume (24h)",
  metricLiquidity: "Liquidity",
  metricAge: "Age",
  metricAgeDays: "{days, plural, one {# day} other {# days}}",
  metricActiveTraders: "Active Traders",
  metricBuyers: "Buyers",
  metricSellers: "Sellers",
};

const messages = { ...en, meme: { ...en.meme, ...METRIC_MESSAGES } };

const fullMetrics: MemeMarketMetricsData = {
  marketCap: { display: "$84.2M" },
  volume24h: { display: "$12.4M" },
  liquidity: { display: "$3.2M" },
  ageDays: 187,
  traders: { buyers: "1,245", sellers: "892", buyerSharePercent: 58.2 },
};

function renderPanel(props: Partial<MemeMarketMetricsProps> = {}) {
  const onToggle = props.onToggle ?? vi.fn();
  const view = render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <MemeMarketMetrics
        expanded
        onToggle={onToggle}
        status="ready"
        metrics={fullMetrics}
        {...props}
      />
    </NextIntlClientProvider>
  );
  return { ...view, onToggle };
}

// The stat item that carries this label, so a value assertion cannot pick up
// the matching figure from a neighbouring card.
function statFor(label: string): HTMLElement {
  const labelNode = screen.getByText(label);
  const item = labelNode.closest("[data-metric]");
  if (!(item instanceof HTMLElement)) throw new Error(`no stat item for ${label}`);
  return item;
}

describe("MemeMarketMetrics", () => {
  it("renders the design's four metrics, in order, with their units", () => {
    renderPanel();
    const labels = screen.getAllByTestId("meme-metric-label").map((node) => node.textContent);
    expect(labels).toEqual(["Market Cap", "Volume (24h)", "Liquidity", "Age"]);
    expect(within(statFor("Market Cap")).getByText("$84.2M")).toBeInTheDocument();
    expect(within(statFor("Volume (24h)")).getByText("$12.4M")).toBeInTheDocument();
    expect(within(statFor("Liquidity")).getByText("$3.2M")).toBeInTheDocument();
    expect(within(statFor("Age")).getByText("187 days")).toBeInTheDocument();
  });

  it("renders the unavailable treatment for a missing value, never a zero", () => {
    renderPanel({
      metrics: { ...fullMetrics, marketCap: { display: null }, ageDays: null },
    });

    const marketCap = statFor("Market Cap");
    expect(within(marketCap).getByText("Unavailable")).toBeInTheDocument();
    expect(marketCap).toHaveAttribute("data-unavailable", "true");
    expect(marketCap.textContent).not.toMatch(/0/);
    expect(marketCap.textContent).not.toMatch(/\$/);

    const age = statFor("Age");
    expect(within(age).getByText("Unavailable")).toBeInTheDocument();
    expect(age.textContent).not.toMatch(/0 days/);

    // A metric that did arrive is untouched by its neighbour's absence.
    expect(statFor("Liquidity")).toHaveAttribute("data-unavailable", "false");
  });

  it("treats a blank display string as unavailable rather than printing nothing", () => {
    renderPanel({ metrics: { ...fullMetrics, liquidity: { display: "   " } } });
    const liquidity = statFor("Liquidity");
    expect(liquidity).toHaveAttribute("data-unavailable", "true");
    expect(within(liquidity).getByText("Unavailable")).toBeInTheDocument();
  });

  it("renders a negative change with the down treatment and a positive one with up", () => {
    renderPanel({
      metrics: {
        ...fullMetrics,
        volume24h: { display: "$12.4M", change: { display: "-3.10%", direction: "down" } },
        marketCap: { display: "$84.2M", change: { display: "+14.25%", direction: "up" } },
      },
    });

    const down = screen.getByText("-3.10%");
    expect(down).toHaveClass("text-down");
    expect(down).not.toHaveClass("text-up");

    const up = screen.getByText("+14.25%");
    expect(up).toHaveClass("text-up");
    expect(up).not.toHaveClass("text-down");
  });

  it("reports the toggle and describes the disclosure to assistive tech", () => {
    const onToggle = vi.fn();
    renderPanel({ expanded: false, onToggle });

    const toggle = screen.getByRole("button", { name: "View Market Metrics" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    const controls = toggle.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    const panel = document.getElementById(controls as string);
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute("hidden");

    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("asks the parent to close when it is already open, and holds no state of its own", () => {
    const onToggle = vi.fn();
    renderPanel({ expanded: true, onToggle });

    const toggle = screen.getByRole("button", { name: "Close Market Metrics" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledWith(false);
    // The parent owns the state, so the panel is still open until it says so.
    expect(screen.getByRole("button", { name: "Close Market Metrics" })).toBeInTheDocument();
  });

  it("announces a loading panel instead of empty metric cards", () => {
    renderPanel({ status: "loading", metrics: null });
    expect(screen.getByRole("status")).toHaveTextContent("Loading market metrics");
    expect(screen.queryByText("Unavailable")).toBeNull();
    expect(screen.queryByTestId("meme-metric-label")).toBeNull();
  });

  it("shows an error with a retry the caller can act on", () => {
    const onRetry = vi.fn();
    renderPanel({ status: "error", metrics: null, onRetry });

    expect(screen.getByRole("alert")).toHaveTextContent("Market metrics couldn't be loaded.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("omits the retry when the caller offers no way to retry", () => {
    renderPanel({ status: "error", metrics: null });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("says the coin has no metrics rather than drawing four empty cards", () => {
    renderPanel({ status: "ready", metrics: null });
    expect(screen.getByText("No market metrics for this coin yet.")).toBeInTheDocument();
    expect(screen.queryByTestId("meme-metric-label")).toBeNull();
  });

  it("splits the trader bar by the buyers' share and colours each side", () => {
    renderPanel();
    expect(screen.getByText("Active Traders")).toBeInTheDocument();
    expect(screen.getByText("1,245")).toHaveClass("text-buy");
    expect(screen.getByText("892")).toHaveClass("text-sell");
    expect(screen.getByText("58.2% / 41.8%")).toBeInTheDocument();
    expect(screen.getByTestId("meme-trader-buy-share")).toHaveStyle({ width: "58.2%" });
  });

  it("clamps a share the service reports outside 0-100", () => {
    renderPanel({
      metrics: {
        ...fullMetrics,
        traders: { buyers: "10", sellers: "0", buyerSharePercent: 140 },
      },
    });
    expect(screen.getByTestId("meme-trader-buy-share")).toHaveStyle({ width: "100%" });
    expect(screen.getByText("100.0% / 0.0%")).toBeInTheDocument();
  });

  it("marks the trader split unavailable when the service publishes none", () => {
    renderPanel({ metrics: { ...fullMetrics, traders: null } });
    const card = screen.getByTestId("meme-traders-card");
    expect(card).toHaveAttribute("data-unavailable", "true");
    expect(within(card).getByText("Unavailable")).toBeInTheDocument();
    expect(within(card).queryByTestId("meme-trader-buy-share")).toBeNull();
  });

  // The Figma comp paints both of these marks #FFD62F, which is exactly
  // --color-kash, so a later pass working from the design would reasonably
  // "restore" the yellow. The user asked for it gone across every page. This
  // test is the only thing that records that decision in code.
  it("draws the trigger dot and glyph in the row's own colour, never the kash yellow", () => {
    renderPanel({ expanded: false });
    const toggle = screen.getByRole("button", { name: "View Market Metrics" });

    for (const node of [toggle, ...toggle.querySelectorAll("*")]) {
      expect(node.getAttribute("class") ?? "").not.toMatch(/kash/);
    }

    // The dot takes the row's white fill and the glyph is stroked with
    // currentColor, so both follow the label instead of holding a colour.
    expect(toggle).toHaveClass("text-white");
    expect(toggle.querySelector("span[aria-hidden]")).toHaveClass("bg-white");
    expect(toggle.querySelector("svg")?.querySelector("path")).toHaveAttribute(
      "stroke",
      "currentColor"
    );
  });

  it("suppresses its own trigger when the parent draws one, and still renders the panel", () => {
    renderPanel({ showTrigger: false, panelId: "board-metrics-panel" });

    expect(screen.queryByRole("button", { name: "View Market Metrics" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Close Market Metrics" })).toBeNull();

    const panel = document.getElementById("board-metrics-panel");
    expect(panel).not.toBeNull();
    expect(panel).not.toHaveAttribute("hidden");
    expect(within(panel as HTMLElement).getByText("$84.2M")).toBeInTheDocument();
  });

  it("takes the panel id from the parent so an outside trigger's aria-controls resolves", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <>
          <button type="button" aria-expanded={false} aria-controls="rail-metrics-panel">
            View Market Metrics
          </button>
          <MemeMarketMetrics
            expanded={false}
            onToggle={vi.fn()}
            status="ready"
            metrics={fullMetrics}
            showTrigger={false}
            panelId="rail-metrics-panel"
          />
        </>
      </NextIntlClientProvider>
    );

    const railTrigger = screen.getByRole("button", { name: "View Market Metrics" });
    const panel = document.getElementById(railTrigger.getAttribute("aria-controls") as string);
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute("hidden");
    expect(panel).toHaveAttribute("role", "group");
  });
});
