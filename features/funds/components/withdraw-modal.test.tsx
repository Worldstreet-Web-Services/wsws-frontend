import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WithdrawModal } from "@/features/funds/components/withdraw-modal";
import messages from "@/messages/en.json";

// The two destination screens pull in wallets and live queries, which this
// test has no interest in: what matters is which of them the modal reaches.
vi.mock("@/features/funds/components/crypto-withdraw-screen", () => ({
  CryptoWithdrawScreen: ({ onBack }: { onBack: () => void }) => (
    <button onClick={onBack}>crypto screen</button>
  ),
}));
vi.mock("@/features/funds/components/bank-withdraw-screen", () => ({
  BankWithdrawScreen: () => <div>bank screen</div>,
}));
vi.mock("@/lib/analytics/mixpanel", () => ({ track: vi.fn() }));

const flag = vi.hoisted(() => ({ enabled: false }));
vi.mock("@/features/funds/lib/flags", () => ({
  get BANK_WITHDRAW_ENABLED() {
    return flag.enabled;
  },
}));

function renderModal(onClose = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <WithdrawModal onClose={onClose} />
    </NextIntlClientProvider>
  );
  return onClose;
}

afterEach(() => {
  flag.enabled = false;
});

describe("WithdrawModal with bank withdrawal disabled", () => {
  it("goes straight to the crypto screen instead of a one-option chooser", () => {
    renderModal();
    expect(screen.getByText("crypto screen")).toBeInTheDocument();
    expect(screen.queryByText("To bank")).not.toBeInTheDocument();
  });

  it("closes the modal on back, since no chooser sits behind it", () => {
    const onClose = renderModal();
    screen.getByText("crypto screen").click();
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("WithdrawModal with bank withdrawal enabled", () => {
  it("offers both methods again", () => {
    flag.enabled = true;
    renderModal();
    expect(screen.getByText("To bank")).toBeInTheDocument();
    expect(screen.getByText("To external wallet")).toBeInTheDocument();
  });
});
