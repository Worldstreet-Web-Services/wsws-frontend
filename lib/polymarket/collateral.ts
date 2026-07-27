"use client";

import { fetchBalanceAllowance } from "@polymarket/client/actions";
import type { SecureClient } from "@/lib/polymarket/secure-client";
import { PUSD_DECIMALS } from "@/lib/polymarket/config";

// The request shape, taken from the action itself so we don't depend on a named
// type export.
type BalanceRequest = Parameters<typeof fetchBalanceAllowance>[1];

// Polymarket's balance API keys the collateral (pUSD) balance under the
// "COLLATERAL" asset type. The AssetType enum is not exported at runtime, so we
// pass the documented string and type it at this third-party seam.
const COLLATERAL_REQUEST = { assetType: "COLLATERAL" } as BalanceRequest;

// Reads the account's spendable pUSD (the collateral bets are placed with), in
// dollars. Goes through the CLOB API (the same transport that places orders), so
// it is as reliable as trading itself. Returns 0 on an unreadable balance.
export async function readCollateralUsd(client: SecureClient): Promise<number> {
  const res = await fetchBalanceAllowance(client, COLLATERAL_REQUEST);
  // `balance` is pUSD in base units (6 decimals) as a string.
  const units = Number((res as { balance?: string }).balance ?? "0");
  return Number.isFinite(units) ? units / 10 ** PUSD_DECIMALS : 0;
}
