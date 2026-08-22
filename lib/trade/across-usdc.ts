"use client";

import { isAddress, type Address, type Hex } from "viem";

import { apiFetch } from "@/lib/api";
import { unwrap } from "@/lib/api/envelope";
import {
  rwasAcrossQuoteSchema,
  type RwasAcrossQuote,
} from "@/lib/api/schemas/rwas-across";
import { USDC_BY_CHAIN } from "@/lib/trade/usdc";

export const ETHEREUM_CHAIN_ID = 1;
export const ETHEREUM_USDC_ADDRESS = USDC_BY_CHAIN.ethereum.address.toLowerCase();

export interface AcrossUsdcCall {
  to: Address;
  data: Hex;
  value?: bigint;
}

export function isEthereumUsdcToBase(network: string, asset: string | null): boolean {
  return network === "eth-mainnet" && asset?.toLowerCase() === ETHEREUM_USDC_ADDRESS;
}

export async function fetchEthereumUsdcToBaseQuote(input: {
  amount: bigint;
  depositor: Address;
}): Promise<RwasAcrossQuote> {
  const response = await apiFetch(
    "/api/across/usdc/quote",
    {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ amount: input.amount.toString(), depositor: input.depositor }),
    },
    { requireAuth: true }
  );
  const payload = await unwrap<unknown>(response, "An Ethereum USDC return route is unavailable.");
  return rwasAcrossQuoteSchema.parse(payload);
}

export function buildEthereumUsdcToBaseCalls(
  quote: RwasAcrossQuote,
  now = Date.now()
): AcrossUsdcCall[] {
  const parsed = rwasAcrossQuoteSchema.parse(quote);
  if (parsed.quoteExpiryTimestamp * 1_000 <= now + 2_000) {
    throw new Error("The USDC bridge quote expired. Request a new quote.");
  }

  return [...parsed.approvalTxns, parsed.swapTx].map((transaction) => {
    if (
      transaction.chainId !== ETHEREUM_CHAIN_ID ||
      !isAddress(transaction.to) ||
      !transaction.data.startsWith("0x")
    ) {
      throw new Error("The USDC bridge transaction is invalid.");
    }
    return {
      to: transaction.to as Address,
      data: transaction.data as Hex,
      ...(transaction.value === undefined ? {} : { value: BigInt(transaction.value) }),
    };
  });
}
