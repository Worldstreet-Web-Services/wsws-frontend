"use client";

import {
  decodeFunctionResult,
  encodeFunctionData,
  erc20Abi,
  isAddress,
  type Address,
  type Hex,
} from "viem";
import { z } from "zod";

import { apiFetch } from "@/lib/api";
import { unwrap } from "@/lib/api/envelope";
import {
  rwasCctpQuoteSchema,
  rwasCctpStatusSchema,
  type RwasCctpQuote,
  type RwasCctpStatus,
} from "@/lib/api/schemas/rwas-cctp";
import {
  addressToCctpBytes32,
  CCTP_ETHEREUM_DOMAIN,
  CCTP_FAST_FINALITY_THRESHOLD,
  CCTP_MESSAGE_TRANSMITTER_V2,
  CCTP_TOKEN_MESSENGER_V2,
  validateBaseToEthereumCctpMessage,
} from "@/lib/trade/cctp";
import { USDC_BY_CHAIN } from "@/lib/trade/usdc";

const USER_OPERATION_HASH = /^0x[0-9a-fA-F]{64}$/u;
const SUPPORTED_BUNDLER_NETWORKS = ["base-mainnet", "eth-mainnet"] as const;

interface JsonRpcResponse {
  result?: string;
  error?: { message?: string };
}

const TOKEN_MESSENGER_V2_ABI = [
  {
    type: "function",
    name: "depositForBurn",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient", type: "bytes32" },
      { name: "burnToken", type: "address" },
      { name: "destinationCaller", type: "bytes32" },
      { name: "maxFee", type: "uint256" },
      { name: "minFinalityThreshold", type: "uint32" },
    ],
    outputs: [],
  },
] as const;

const MESSAGE_TRANSMITTER_V2_ABI = [
  {
    type: "function",
    name: "receiveMessage",
    stateMutability: "nonpayable",
    inputs: [
      { name: "message", type: "bytes" },
      { name: "attestation", type: "bytes" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
] as const;

const MESSAGE_TRANSMITTER_NONCE_ABI = [
  {
    type: "function",
    name: "usedNonces",
    stateMutability: "view",
    inputs: [{ name: "nonce", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export interface CctpCall {
  to: Address;
  data: Hex;
}

export interface CctpUserOperationReceipt {
  state: "pending" | "confirmed" | "failed";
  transactionHash: Hex | null;
}

export async function fetchRwasCctpQuote(input: {
  amount: string;
  depositor: Address;
}): Promise<RwasCctpQuote> {
  const response = await apiFetch(
    "/api/rwas/cctp/quote",
    {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(input),
    },
    { requireAuth: true }
  );
  const payload = await unwrap<unknown>(response, "A Circle Fast Transfer is unavailable.");
  return rwasCctpQuoteSchema.parse(payload);
}

export async function fetchRwasCctpStatus(input: {
  sourceTransactionHash: Hex;
  depositor: Address;
  amount: string;
}): Promise<RwasCctpStatus> {
  const query = new URLSearchParams(input);
  const response = await apiFetch(
    `/api/rwas/cctp/status?${query.toString()}`,
    { headers: { accept: "application/json" } },
    { requireAuth: true }
  );
  const payload = await unwrap<unknown>(response, "The Circle attestation is unavailable.");
  return rwasCctpStatusSchema.parse(payload);
}

export function buildRwasCctpBurnCalls(input: {
  quote: RwasCctpQuote;
  depositor: Address;
  now?: number;
}): CctpCall[] {
  const quote = rwasCctpQuoteSchema.parse(input.quote);
  const now = input.now ?? Date.now();
  if (quote.quoteExpiryTimestamp * 1_000 <= now + 2_000) {
    throw new Error("The Circle transfer quote expired. Request a new quote.");
  }
  if (!isAddress(input.depositor)) throw new Error("The CCTP wallet address is invalid.");

  const amount = BigInt(quote.inputAmount);
  const maxFee = BigInt(quote.maxFee);
  if (
    amount <= 0n ||
    maxFee >= amount ||
    BigInt(quote.expectedOutputAmount) > amount ||
    BigInt(quote.minOutputAmount) !== amount - maxFee
  ) {
    throw new Error("The Circle transfer quote is invalid.");
  }
  const walletBytes = addressToCctpBytes32(input.depositor);

  return [
    {
      to: USDC_BY_CHAIN.base.address as Address,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [CCTP_TOKEN_MESSENGER_V2, amount],
      }),
    },
    {
      to: CCTP_TOKEN_MESSENGER_V2,
      data: encodeFunctionData({
        abi: TOKEN_MESSENGER_V2_ABI,
        functionName: "depositForBurn",
        args: [
          amount,
          CCTP_ETHEREUM_DOMAIN,
          walletBytes,
          USDC_BY_CHAIN.base.address as Address,
          walletBytes,
          maxFee,
          CCTP_FAST_FINALITY_THRESHOLD,
        ],
      }),
    },
  ];
}

export function buildRwasCctpReceiveCall(input: {
  status: Extract<RwasCctpStatus, { status: "complete" }>;
  depositor: Address;
  amount: bigint;
}): CctpCall & { outputAmount: bigint } {
  const status = rwasCctpStatusSchema.parse(input.status);
  if (status.status !== "complete") throw new Error("The Circle attestation is not ready.");
  const decoded = validateBaseToEthereumCctpMessage({
    message: status.message as Hex,
    depositor: input.depositor,
    amount: input.amount,
  });
  if (
    decoded.outputAmount.toString() !== status.outputAmount ||
    decoded.feeExecuted.toString() !== status.feeExecuted
  ) {
    throw new Error("The Circle attestation amount is invalid.");
  }

  return {
    to: CCTP_MESSAGE_TRANSMITTER_V2,
    data: encodeFunctionData({
      abi: MESSAGE_TRANSMITTER_V2_ABI,
      functionName: "receiveMessage",
      args: [status.message as Hex, status.attestation as Hex],
    }),
    outputAmount: decoded.outputAmount,
  };
}

export async function fetchRwasCctpMessageReceived(input: {
  message: Hex;
  depositor: Address;
  amount: bigint;
}): Promise<boolean> {
  const decoded = validateBaseToEthereumCctpMessage(input);
  const data = encodeFunctionData({
    abi: MESSAGE_TRANSMITTER_NONCE_ABI,
    functionName: "usedNonces",
    args: [decoded.nonce],
  });
  const response = await apiFetch(
    "/api/evm-rpc/eth-mainnet",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "eth_call",
        params: [{ to: CCTP_MESSAGE_TRANSMITTER_V2, data }, "latest"],
      }),
    },
    { requireAuth: true }
  );
  if (!response.ok) throw new Error("The Circle settlement state is temporarily unavailable.");
  const payload = (await response.json().catch(() => null)) as JsonRpcResponse | null;
  if (!payload?.result || payload.error) {
    throw new Error("The Circle settlement state could not be read.");
  }
  return (
    decodeFunctionResult({
      abi: MESSAGE_TRANSMITTER_NONCE_ABI,
      functionName: "usedNonces",
      data: payload.result as Hex,
    }) !== 0n
  );
}

const userOperationReceiptSchema = z.object({
  result: z
    .object({
      success: z.boolean().optional(),
      receipt: z.object({
        transactionHash: z.string(),
        status: z.string().optional(),
      }),
    })
    .nullable()
    .optional(),
  error: z.object({ message: z.string().optional() }).optional(),
});

export async function fetchCctpUserOperationReceipt(
  network: (typeof SUPPORTED_BUNDLER_NETWORKS)[number],
  userOperationHash: Hex
): Promise<CctpUserOperationReceipt> {
  if (
    !SUPPORTED_BUNDLER_NETWORKS.includes(network) ||
    !USER_OPERATION_HASH.test(userOperationHash)
  ) {
    throw new Error("The sponsored transaction reference is invalid.");
  }
  const response = await apiFetch(
    `/api/alchemy-bundler/${network}`,
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
  if (!response.ok) throw new Error("The sponsored transaction receipt is unavailable.");
  const parsed = userOperationReceiptSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("The sponsored transaction receipt is invalid.");
  if (parsed.data.error) {
    throw new Error(
      parsed.data.error.message ?? "The sponsored transaction receipt is unavailable."
    );
  }
  const result = parsed.data.result;
  if (!result) return { state: "pending", transactionHash: null };
  const transactionHash = result.receipt.transactionHash;
  if (!USER_OPERATION_HASH.test(transactionHash)) {
    throw new Error("The sponsored transaction hash is invalid.");
  }
  const failed = result.success === false || result.receipt.status === "0x0";
  return {
    state: failed ? "failed" : "confirmed",
    transactionHash: transactionHash as Hex,
  };
}
