"use client";

import { isAddress, type Address, type Hex } from "viem";
import { z } from "zod";

import { apiFetch } from "@/lib/api";
import { unwrap } from "@/lib/api/envelope";
import {
  rwasAcrossQuoteSchema,
  rwasAcrossStatusSchema,
  type RwasAcrossQuote,
  type RwasAcrossStatus,
} from "@/lib/api/schemas/rwas-across";

const BASE_CHAIN_ID = 8453;
const USER_OPERATION_HASH = /^0x[0-9a-fA-F]{64}$/u;

export interface AcrossCall {
  to: Address;
  data: Hex;
  value?: bigint;
}

export async function fetchRwasAcrossQuote(input: {
  amount: string;
  depositor: Address;
}): Promise<RwasAcrossQuote> {
  const response = await apiFetch(
    "/api/rwas/across/quote",
    {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(input),
    },
    { requireAuth: true }
  );
  const payload = await unwrap<unknown>(response, "A Base to Ethereum route is unavailable.");
  return rwasAcrossQuoteSchema.parse(payload);
}

export async function fetchRwasAcrossStatus(
  depositTxnRef: Hex
): Promise<RwasAcrossStatus> {
  const response = await apiFetch(
    `/api/rwas/across/status?depositTxnRef=${encodeURIComponent(depositTxnRef)}`,
    { headers: { accept: "application/json" } },
    { requireAuth: true }
  );
  const payload = await unwrap<unknown>(response, "Bridge status is unavailable.");
  return rwasAcrossStatusSchema.parse(payload);
}

export function buildRwasAcrossCalls(quote: RwasAcrossQuote, now = Date.now()): AcrossCall[] {
  const parsed = rwasAcrossQuoteSchema.parse(quote);
  if (parsed.quoteExpiryTimestamp * 1_000 <= now + 2_000) {
    throw new Error("The bridge quote expired. Request a new quote.");
  }

  const transactions = [...parsed.approvalTxns, parsed.swapTx];
  return transactions.map((transaction) => {
    if (
      transaction.chainId !== BASE_CHAIN_ID ||
      !isAddress(transaction.to) ||
      !transaction.data.startsWith("0x")
    ) {
      throw new Error("The bridge transaction is invalid.");
    }
    return {
      to: transaction.to as Address,
      data: transaction.data as Hex,
      ...(transaction.value === undefined ? {} : { value: BigInt(transaction.value) }),
    };
  });
}

const userOperationReceiptSchema = z.object({
  result: z
    .object({ receipt: z.object({ transactionHash: z.string() }) })
    .nullable()
    .optional(),
  error: z.object({ message: z.string().optional() }).optional(),
});

export async function fetchBaseUserOperationTransactionHash(
  userOperationHash: Hex
): Promise<Hex | null> {
  if (!USER_OPERATION_HASH.test(userOperationHash)) {
    throw new Error("The bridge submission hash is invalid.");
  }
  const response = await apiFetch(
    "/api/alchemy-bundler/base-mainnet",
    {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "eth_getUserOperationReceipt",
        params: [userOperationHash],
      }),
    },
    { requireAuth: true }
  );
  if (!response.ok) throw new Error("The Base bridge submission is still being confirmed.");
  const parsed = userOperationReceiptSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("The Base bridge receipt is invalid.");
  if (parsed.data.error) {
    throw new Error(parsed.data.error.message ?? "The Base bridge receipt is unavailable.");
  }
  const hash = parsed.data.result?.receipt.transactionHash;
  if (!hash) return null;
  if (!USER_OPERATION_HASH.test(hash)) throw new Error("The Base transaction hash is invalid.");
  return hash as Hex;
}
