"use client";

import { decodeFunctionResult, encodeFunctionData, erc20Abi, type Address } from "viem";

import { apiFetch } from "@/lib/api";

interface JsonRpcResponse {
  result?: string;
  error?: { message?: string };
}

const BALANCE_POLL_MS = 2_000;
const BALANCE_TIMEOUT_MS = 90_000;

export async function fetchErc20Balance(
  network: string,
  token: Address,
  owner: Address
): Promise<bigint> {
  const data = encodeFunctionData({ abi: erc20Abi, functionName: "balanceOf", args: [owner] });
  const response = await apiFetch(
    `/api/evm-rpc/${encodeURIComponent(network)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "eth_call",
        params: [{ to: token, data }, "latest"],
      }),
    },
    { requireAuth: true }
  );
  if (!response.ok) throw new Error("The token balance is temporarily unavailable.");
  const payload = (await response.json()) as JsonRpcResponse;
  if (!payload.result || payload.error) throw new Error("The token balance could not be read.");
  return decodeFunctionResult({
    abi: erc20Abi,
    functionName: "balanceOf",
    data: payload.result as `0x${string}`,
  });
}

export async function fetchErc20Allowance(
  network: string,
  token: Address,
  owner: Address,
  spender: Address
): Promise<bigint> {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, spender],
  });
  const response = await apiFetch(
    `/api/evm-rpc/${encodeURIComponent(network)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "eth_call",
        params: [{ to: token, data }, "latest"],
      }),
    },
    { requireAuth: true }
  );
  if (!response.ok) throw new Error("The token allowance is temporarily unavailable.");
  const payload = (await response.json()) as JsonRpcResponse;
  if (!payload.result || payload.error) throw new Error("The token allowance could not be read.");
  return decodeFunctionResult({
    abi: erc20Abi,
    functionName: "allowance",
    data: payload.result as `0x${string}`,
  });
}

export async function waitForErc20BalanceIncrease(input: {
  network: string;
  token: Address;
  owner: Address;
  startingBalance: bigint;
  minimumIncrease: bigint;
}): Promise<bigint> {
  const deadline = Date.now() + BALANCE_TIMEOUT_MS;
  do {
    const balance = await fetchErc20Balance(input.network, input.token, input.owner);
    if (balance - input.startingBalance >= input.minimumIncrease) return balance;
    await new Promise((resolve) => setTimeout(resolve, BALANCE_POLL_MS));
  } while (Date.now() < deadline);
  throw new Error("Ethereum USDC delivery is still confirming. Your funds remain in your wallet.");
}
