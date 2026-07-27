"use client";

import { useCallback, useState } from "react";
import { usePrivy, useSendTransaction, useWallets } from "@privy-io/react-auth";
import { encodeFunctionData, erc20Abi } from "viem";
import { friendlyError } from "@/lib/errors";
import { usePolymarketSession } from "@/hooks/use-polymarket-session";
import { useEvmSwapExecute } from "@/hooks/use-evm-swap-execute";
import { useSendToken } from "@/hooks/use-withdraw";
import { getWalletAddress } from "@/lib/user";
import { CONTRACTS, POLYGON_CHAIN_ID, PUSD_DECIMALS } from "@/lib/polymarket/config";
import { SETTLE_CHAINS } from "@/lib/deposit";
import { fetchSellQuote } from "@/lib/sell";
import { toBaseUnits } from "@/lib/trade/math";
import { awaitReceipt, publicClientForChain } from "@/lib/trade/receipt";

// Turns pUSD (Polymarket collateral, on Polygon) into USDC on Base, in the
// user's own wallet. Polymarket's offramp only exists on Polygon, so the path is
// necessarily: pUSD -> USDC.e (offramp) -> USDC (Polygon, via LI.FI) -> USDC
// (Base, via the Dextopus bridge). The Polygon steps are signed by the EOA and
// need a little POL for gas, so we check that up front and stop with a clear
// message rather than failing halfway.

// CollateralOfframp.unwrap(asset, to, amount): burns pUSD, sends USDC.e to `to`.
const OFFRAMP_ABI = [
  {
    type: "function",
    name: "unwrap",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_asset", type: "address" },
      { name: "_to", type: "address" },
      { name: "_amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export type SettlePhase = "idle" | "unwrapping" | "bridging";

// A user-facing settle error whose message is shown verbatim.
class SettleError extends Error {}

const POLYGON_USDC = SETTLE_CHAINS.polygon.usdc;

async function polygonUsdcBalance(
  client: ReturnType<typeof publicClientForChain>,
  owner: string
): Promise<bigint> {
  return client.readContract({
    address: POLYGON_USDC as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [owner as `0x${string}`],
  });
}

export function useSettleToBase() {
  const { user } = usePrivy();
  const { sendTransaction } = useSendTransaction();
  const { wallets } = useWallets();
  const { ensureReady } = usePolymarketSession();
  const executeEvmSwap = useEvmSwapExecute();
  const { sendToken } = useSendToken();
  const [phase, setPhase] = useState<SettlePhase>("idle");
  const [error, setError] = useState<string | null>(null);

  // Moves `amountUsd` of pUSD to USDC on Base. Returns the Dextopus request id so
  // the caller can track the final bridge leg if it wants.
  const settleToBase = useCallback(
    async (amountUsd: number): Promise<void> => {
      setError(null);
      setPhase("unwrapping");
      try {
        const eoa = getWalletAddress(user, "ethereum");
        if (!eoa) throw new SettleError("No wallet connected.");
        const wallet = wallets.find((w) => w.address.toLowerCase() === eoa.toLowerCase());
        if (!wallet) throw new SettleError("Wallet is not ready. Try again.");

        const polygon = publicClientForChain(POLYGON_CHAIN_ID);

        // Gas gate: the Polygon offramp + bridge send are signed by the EOA and
        // need POL. Check first so we never strand funds mid-flow.
        const pol = await polygon.getBalance({ address: eoa as `0x${string}` });
        console.info("[settle] POL balance (wei):", pol.toString());
        if (pol <= 0n) {
          throw new SettleError(
            "You need a little POL on Polygon to move winnings to your balance. Add some, then try again."
          );
        }

        const client = await ensureReady();
        const amount = toBaseUnits(String(amountUsd), PUSD_DECIMALS);
        console.info("[settle] settling", amountUsd, "pUSD ->", amount.toString(), "base units");

        // 1) pUSD Deposit Wallet -> EOA (gasless).
        const transfer = await client.transferErc20({
          tokenAddress: CONTRACTS.pusd,
          recipientAddress: eoa,
          amount,
        });
        await transfer.wait();
        console.info("[settle] step 1 ok: pUSD moved to EOA");

        // 2) Approve the offramp to spend the EOA's pUSD.
        const approve = await sendTransaction(
          {
            to: CONTRACTS.pusd,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
              args: [CONTRACTS.collateralOfframp as `0x${string}`, amount],
            }),
            chainId: POLYGON_CHAIN_ID,
          },
          { address: eoa }
        );
        await awaitReceipt(polygon, approve.hash, "The approval");
        console.info("[settle] step 2 ok: offramp approved", approve.hash);

        // 3) Unwrap pUSD -> USDC.e to the EOA.
        const unwrap = await sendTransaction(
          {
            to: CONTRACTS.collateralOfframp,
            data: encodeFunctionData({
              abi: OFFRAMP_ABI,
              functionName: "unwrap",
              args: [CONTRACTS.usdcE as `0x${string}`, eoa as `0x${string}`, amount],
            }),
            chainId: POLYGON_CHAIN_ID,
          },
          { address: eoa }
        );
        await awaitReceipt(polygon, unwrap.hash, "The unwrap");
        console.info("[settle] step 3 ok: unwrapped pUSD -> USDC.e", unwrap.hash);

        // 4) USDC.e -> native Polygon USDC (LI.FI, same chain).
        await executeEvmSwap({
          fromChainId: POLYGON_CHAIN_ID,
          fromToken: CONTRACTS.usdcE,
          toToken: POLYGON_USDC,
          fromAmount: amount,
          slippageBps: 50,
        });
        console.info("[settle] step 4 ok: USDC.e -> Polygon USDC");

        // 5) Bridge the Polygon USDC we now hold to USDC on Base (Dextopus), to
        // the user's own wallet. Read the real balance so we send exactly what
        // landed after the swap, not a stale figure.
        setPhase("bridging");
        const balance = await polygonUsdcBalance(polygon, eoa);
        console.info("[settle] Polygon USDC balance to bridge:", balance.toString());
        if (balance <= 0n) {
          throw new SettleError(
            "Your funds are in your Polygon wallet as USDC. The final move to Base didn't start; try again."
          );
        }
        const quote = await fetchSellQuote({
          network: "polygon-mainnet",
          asset: POLYGON_USDC,
          amount: balance,
          recipient: eoa,
          refundTo: eoa,
          slippageBps: 100,
        });
        console.info("[settle] bridge quote depositAddress:", quote.depositAddress);
        const hash = await sendToken({
          network: "polygon-mainnet",
          tokenAddress: POLYGON_USDC,
          decimals: SETTLE_CHAINS.polygon.decimals,
          to: quote.depositAddress,
          amount: balance,
        });
        console.info("[settle] step 5 ok: sent Polygon USDC to bridge, tx:", hash);
      } catch (e) {
        console.error("[settle] failed:", e);
        setError(
          e instanceof SettleError ? e.message : friendlyError(e, "Couldn't cash out. Try again.")
        );
        throw e;
      } finally {
        setPhase("idle");
      }
    },
    [user, wallets, sendTransaction, ensureReady, executeEvmSwap, sendToken]
  );

  return { settleToBase, phase, error };
}
