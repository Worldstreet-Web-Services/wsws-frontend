import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import type { KashAccount } from "@/features/portfolio/lib/kash";

const kashHooks = vi.hoisted(() => ({
  useKashAccount: vi.fn(),
  useKashStatus: vi.fn(() => ({ data: undefined })),
  useKashSubscription: vi.fn(() => ({ data: undefined })),
  useKashClaim: vi.fn(() => ({ isPending: false, mutateAsync: vi.fn() })),
}));
vi.mock("@/features/portfolio/hooks/use-kash", () => kashHooks);
vi.mock("@/hooks/use-kash-sync", () => ({ useKashSyncing: () => false }));
vi.mock("@/features/portfolio/components/add-to-metamask-button", () => ({
  AddToMetaMaskButton: () => null,
}));
vi.mock("@/lib/analytics/mixpanel", () => ({ setProfile: vi.fn() }));
// The balance animation tweens via framer-motion, which does not advance in
// jsdom; render its target value directly so these assert the number shown.
vi.mock("@/components/ui/money-ticker", () => ({
  MoneyTicker: ({ value, format }: { value: number; format: (n: number) => string }) =>
    format(value),
}));

import { KashCard } from "@/features/portfolio/components/kash-card";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </NextIntlClientProvider>
  );
}

const account = (over: Partial<KashAccount> = {}): KashAccount =>
  ({
    wallet: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    balance: "1250",
    balanceUsd: "7.50",
    lifetimeEarned: "0",
    gate: { met: true, shortfall: "0", minHoldingUsd: "10" },
    week: { unclaimed: "0" },
    settlements: [],
    ...over,
  }) as KashAccount;

function renderCard() {
  render(
    <KashCard
      onBuy={() => {}}
      onSend={() => {}}
      onConvert={() => {}}
      onHistory={() => {}}
      onUpgrade={() => {}}
    />,
    { wrapper }
  );
}

// The bug this guards: the card used to fall back to "0" whenever the account
// query returned nothing, so a failed read was indistinguishable from an empty
// wallet and holders were told their balance was zero.
describe("KashCard balance states", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the balance once the account loads", () => {
    kashHooks.useKashAccount.mockReturnValue({
      data: account(),
      isError: false,
      walletMissing: false,
    });
    renderCard();
    expect(screen.getByText("1,250")).toBeInTheDocument();
    expect(screen.getByText("$7.50")).toBeInTheDocument();
  });

  it("shows a real zero for an account that genuinely holds none", () => {
    kashHooks.useKashAccount.mockReturnValue({
      data: account({ balance: "0", balanceUsd: "0" }),
      isError: false,
      walletMissing: false,
    });
    renderCard();
    // Scope to the balance itself: the redesigned card carries other zeros
    // (points, claimable) that are not the balance under test.
    const balance = within(screen.getByTestId("kash-balance"));
    expect(balance.getByText("0")).toBeInTheDocument();
    expect(balance.queryByText(messages.kash.balanceUnavailable)).not.toBeInTheDocument();
  });

  it("says the balance could not be loaded instead of printing zero when the read fails", () => {
    kashHooks.useKashAccount.mockReturnValue({
      data: undefined,
      isError: true,
      walletMissing: false,
    });
    renderCard();
    const balance = within(screen.getByTestId("kash-balance"));
    expect(balance.getByText(messages.kash.balanceUnavailable)).toBeInTheDocument();
    expect(balance.queryByText("0")).not.toBeInTheDocument();
  });

  it("explains the wallet is still setting up when the query never runs", () => {
    kashHooks.useKashAccount.mockReturnValue({
      data: undefined,
      isError: false,
      walletMissing: true,
    });
    renderCard();
    const balance = within(screen.getByTestId("kash-balance"));
    expect(balance.getByText(messages.kash.balanceNoWallet)).toBeInTheDocument();
    expect(balance.queryByText("0")).not.toBeInTheDocument();
  });

  it("renders neither a number nor an error while the read is still in flight", () => {
    kashHooks.useKashAccount.mockReturnValue({
      data: undefined,
      isError: false,
      walletMissing: false,
    });
    renderCard();
    const balance = within(screen.getByTestId("kash-balance"));
    expect(balance.queryByText("0")).not.toBeInTheDocument();
    expect(balance.queryByText(messages.kash.balanceUnavailable)).not.toBeInTheDocument();
    expect(balance.queryByText(messages.kash.balanceNoWallet)).not.toBeInTheDocument();
  });
});
