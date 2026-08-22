"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";

import { usePortfolio } from "@/hooks/use-portfolio";

import styles from "./rwa-nav.module.css";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function RwaWalletBalance() {
  const { ready, authenticated } = usePrivy();
  const portfolio = usePortfolio();
  const baseUsdc = portfolio.tokens
    .filter(
      (token) => token.network === "base-mainnet" && token.symbol.toUpperCase() === "USDC"
    )
    .reduce((total, token) => total + token.balance, 0);
  const pending = !ready || (authenticated && portfolio.loading);
  const available = ready && authenticated && !portfolio.error;
  const displayBalance = pending ? "···" : available ? money.format(baseUsdc) : "—";

  return (
    <Link
      href="/dashboard#portfolio"
      className={styles.walletBalance}
      aria-label={
        available
          ? `Base USDC available balance ${money.format(baseUsdc)}`
          : "View wallet balance in Portfolio"
      }
    >
      <span className={styles.walletBalanceIcon} aria-hidden="true">
        <WalletIcon />
      </span>
      <span className={styles.walletBalanceCopy}>
        <small>Available</small>
        <strong>{displayBalance}</strong>
      </span>
      <span className={styles.walletBalanceCurrency}>USDC</span>
    </Link>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 7.5h14.5A1.5 1.5 0 0 1 20 9v8.5A1.5 1.5 0 0 1 18.5 19h-14A2.5 2.5 0 0 1 2 16.5v-10A2.5 2.5 0 0 1 4.5 4H17v3.5" />
      <path d="M16 12h4v3h-4a1.5 1.5 0 0 1 0-3Z" />
    </svg>
  );
}
