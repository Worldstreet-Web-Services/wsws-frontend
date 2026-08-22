"use client";

import { encodeFunctionData, type Address, type Hex } from "viem";

import { apiFetch } from "@/lib/api";
import { unwrap } from "@/lib/api/envelope";
import type { RwasDexQuote, RwasDexQuoteRequest } from "@/lib/api/schemas/rwas-dex";

const APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export interface RwasDexCall {
  to: Address;
  data?: Hex;
  value?: bigint;
}

export async function fetchRwasDexQuote(
  input: RwasDexQuoteRequest,
  signal?: AbortSignal
): Promise<RwasDexQuote> {
  const response = await apiFetch(
    "/api/rwas/dex/quote",
    {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(input),
      signal,
    },
    { requireAuth: true }
  );
  return unwrap<RwasDexQuote>(response, "An executable Ethereum quote is unavailable.");
}

export function buildRwasDexCalls(quote: RwasDexQuote): RwasDexCall[] {
  if (!quote.simulated || quote.chainId !== 1) {
    throw new Error("The Ethereum quote was not simulated.");
  }
  if (Date.parse(quote.expiresAt) <= Date.now()) {
    throw new Error("The Ethereum quote expired. Request a new quote.");
  }

  const calls: RwasDexCall[] = [];
  if (quote.approval) {
    calls.push({
      to: quote.approval.tokenAddress as Address,
      data: encodeFunctionData({
        abi: APPROVE_ABI,
        functionName: "approve",
        args: [quote.approval.spenderAddress as Address, BigInt(quote.approval.amount)],
      }),
    });
  }
  calls.push({
    to: quote.transaction.to as Address,
    data: quote.transaction.data as Hex,
    value: BigInt(quote.transaction.value),
  });
  return calls;
}
