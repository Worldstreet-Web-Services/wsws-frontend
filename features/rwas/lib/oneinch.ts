"use client";

import { encodeFunctionData, erc20Abi, type Address, type Hex } from "viem";

import { apiFetch } from "@/lib/api";
import { unwrap } from "@/lib/api/envelope";
import type {
  RwasOneInchOrderStatus,
  RwasOneInchPreparedOrder,
  RwasOneInchQuote,
  RwasOneInchQuoteRequest,
  RwasOneInchSubmitResponse,
} from "@/lib/api/schemas/rwas-oneinch";

export async function fetchRwasOneInchQuote(
  input: RwasOneInchQuoteRequest,
  signal?: AbortSignal
): Promise<RwasOneInchQuote> {
  const response = await apiFetch(
    "/api/rwas/oneinch/quote",
    {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(input),
      signal,
    },
    { requireAuth: true }
  );
  return unwrap<RwasOneInchQuote>(response, "A 1inch Fusion quote is unavailable.");
}

export async function prepareRwasOneInchOrder(
  input: RwasOneInchQuoteRequest,
  signal?: AbortSignal
): Promise<RwasOneInchPreparedOrder> {
  const response = await apiFetch(
    "/api/rwas/oneinch/prepare",
    {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(input),
      signal,
    },
    { requireAuth: true }
  );
  return unwrap<RwasOneInchPreparedOrder>(response, "The 1inch order is unavailable.");
}

export async function submitRwasOneInchOrder(
  ticket: string,
  signature: Hex,
  signal?: AbortSignal
): Promise<RwasOneInchSubmitResponse> {
  const response = await apiFetch(
    "/api/rwas/oneinch/submit",
    {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ ticket, signature }),
      signal,
    },
    { requireAuth: true }
  );
  return unwrap<RwasOneInchSubmitResponse>(response, "The 1inch order was not submitted.");
}

export async function fetchRwasOneInchOrderStatus(
  orderHash: Hex,
  signal?: AbortSignal
): Promise<RwasOneInchOrderStatus> {
  const query = new URLSearchParams({ orderHash });
  const response = await apiFetch(
    `/api/rwas/oneinch/status?${query}`,
    { headers: { accept: "application/json" }, signal },
    { requireAuth: true }
  );
  return unwrap<RwasOneInchOrderStatus>(response, "The 1inch order status is unavailable.");
}

export function buildRwasOneInchApproval(input: {
  tokenAddress: string;
  spenderAddress: string;
  amount: string;
}): { to: Address; data: Hex } {
  return {
    to: input.tokenAddress as Address,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [input.spenderAddress as Address, BigInt(input.amount)],
    }),
  };
}
