"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { formatUnits, isAddress, type Address } from "viem";

import { useRwasOneInchOrder } from "@/features/rwas/hooks/use-rwas-oneinch-order";
import { buildRwasCctpBurnCalls, fetchRwasCctpQuote } from "@/features/rwas/lib/cctp";
import { fetchErc20Balance } from "@/features/rwas/lib/evm-balance";
import { fetchRwasOneInchQuote } from "@/features/rwas/lib/oneinch";
import {
  BASE_NETWORK,
  BASE_USDC_ADDRESS,
  ETHEREUM_CHAIN_ID,
  ETHEREUM_NETWORK,
  ETHEREUM_USDC_ADDRESS,
  USDC_DECIMALS,
} from "@/features/rwas/lib/ondo-order";
import {
  clearPendingRwasPurchase,
  pendingRwasPurchasesSnapshot,
  requestPendingRwasPurchaseRetry,
  savePendingRwasPurchase,
  serverPendingRwasPurchasesSnapshot,
  subscribePendingRwasPurchases,
  type PendingRwasPurchase,
} from "@/features/rwas/lib/pending-purchase";
import { useEvmSendBatch } from "@/hooks/use-evm-send";
import { errorCode } from "@/lib/api/envelope";
import { BASE_CHAIN_ID } from "@/lib/deposit";
import { toast } from "@/lib/toast";
import { toBaseUnits } from "@/lib/trade/math";
import { USDC_BY_CHAIN } from "@/lib/trade/usdc";
import { getWalletAddress } from "@/lib/user";
import type { RwasOneInchQuote } from "@/lib/api/schemas/rwas-oneinch";
import type { MarketAssetDetails } from "@/lib/api/schemas/rwas";

type TradeSide = "buy" | "sell";
type TradePhase =
  | "idle"
  | "checking-availability"
  | "quoting-route"
  | "sending-base-usdc"
  | "bridging"
  | "approving-order"
  | "preparing-order"
  | "submitting-order"
  | "submitted"
  | "error";

export interface RwasTradeBlock {
  code: "ASSET_PAUSED" | "MARKET_PAUSED" | "MARKET_CLOSED" | "SESSION_LIMIT_REACHED";
  message: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The trade could not be submitted.";
}

function executionAmount(quote: RwasOneInchQuote): string {
  return formatUnits(BigInt(quote.output.amount), quote.output.decimals);
}

function tradeBlock(error: unknown): RwasTradeBlock | null {
  const code = errorCode(error);
  if (
    code !== "ASSET_PAUSED" &&
    code !== "MARKET_PAUSED" &&
    code !== "MARKET_CLOSED" &&
    code !== "SESSION_LIMIT_REACHED"
  ) {
    return null;
  }
  return { code, message: errorMessage(error) };
}

export function useRwasTrade(detail: MarketAssetDetails) {
  const { ready, authenticated, user, login } = usePrivy();
  const sendBatch = useEvmSendBatch();
  const executeOneInchOrder = useRwasOneInchOrder();
  const wallet = getWalletAddress(user, "ethereum");
  const ethereumDeployment = useMemo(
    () => detail.networks.find((network) => network.chainId === ETHEREUM_CHAIN_ID) ?? null,
    [detail.networks]
  );
  const balanceQuery = useQuery({
    queryKey: ["rwas-trade-balances", wallet, ethereumDeployment?.address],
    queryFn: async () => {
      if (
        !wallet ||
        !isAddress(wallet) ||
        !ethereumDeployment ||
        !isAddress(ethereumDeployment.address)
      ) {
        throw new Error("The trade balances are unavailable.");
      }
      const owner = wallet as Address;
      const [baseUsdc, asset] = await Promise.all([
        fetchErc20Balance(BASE_NETWORK, BASE_USDC_ADDRESS, owner),
        fetchErc20Balance(ETHEREUM_NETWORK, ethereumDeployment.address as Address, owner),
      ]);
      return { baseUsdc, asset };
    },
    enabled: Boolean(
      ready &&
      authenticated &&
      wallet &&
      isAddress(wallet) &&
      ethereumDeployment &&
      isAddress(ethereumDeployment.address)
    ),
    staleTime: 10_000,
    refetchInterval: 20_000,
    retry: 1,
  });
  const { refetch: refetchBalances } = balanceQuery;
  const pendingPurchases = useSyncExternalStore(
    subscribePendingRwasPurchases,
    pendingRwasPurchasesSnapshot,
    serverPendingRwasPurchasesSnapshot
  );
  const pendingBuy = useMemo(
    () =>
      wallet
        ? (pendingPurchases.find(
            (pending) =>
              pending.walletAddress.toLowerCase() === wallet.toLowerCase() &&
              pending.assetSymbol.toLowerCase() === detail.asset.symbol.toLowerCase()
          ) ?? null)
        : null,
    [detail.asset.symbol, pendingPurchases, wallet]
  );
  const pendingBuyNeedsEthereumClaim = Boolean(
    pendingBuy?.version === 3 &&
    pendingBuy.sourceTransactionHash &&
    !pendingBuy.destinationUserOperationHash &&
    !pendingBuy.destinationTransactionHash
  );
  const pendingBuyClaimingEthereumUsdc = Boolean(
    pendingBuy?.version === 3 &&
    pendingBuy.destinationOperationKind === "mint" &&
    pendingBuy.destinationUserOperationHash
  );
  const pendingBuyHasEthereumUsdc = Boolean(
    pendingBuy?.version === 3 &&
    pendingBuy.destinationOperationKind === "mint" &&
    (pendingBuy.destinationTransactionHash || pendingBuy.ethereumUsdcReceivedAt)
  );
  const [phase, setPhase] = useState<TradePhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [blockedTrade, setBlockedTrade] = useState<RwasTradeBlock | null>(null);
  const [firmQuote, setFirmQuote] = useState<RwasOneInchQuote | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const clearPendingBuy = useCallback(() => {
    if (!pendingBuy) return;
    clearPendingRwasPurchase(pendingBuy.requestId);
    setPhase("idle");
    setError(null);
    setBlockedTrade(null);
    setFirmQuote(null);
    setTransactionHash(null);
    void refetchBalances();
    toast.info("Pending purchase cleared. No transaction was submitted.");
  }, [pendingBuy, refetchBalances]);

  const submitOrder = useCallback(
    async (input: { side: TradeSide; inputAmount: bigint; quoteAmount: string }) => {
      if (!wallet || !isAddress(wallet)) {
        throw new Error("Your embedded EVM wallet is still being prepared. Try again shortly.");
      }
      setPhase("preparing-order");
      const submitted = await executeOneInchOrder(
        {
          symbol: detail.asset.symbol,
          side: input.side,
          amount: input.quoteAmount,
          walletAddress: wallet,
        },
        (nextPhase) => {
          setPhase(
            nextPhase === "checking"
              ? "checking-availability"
              : nextPhase === "approving"
                ? "approving-order"
                : nextPhase === "submitting"
                  ? "submitting-order"
                  : "preparing-order"
          );
        }
      );
      const quote = submitted.quote;
      if (BigInt(quote.input.amount) !== input.inputAmount) {
        throw new Error("The Ethereum quote amount changed. Request a fresh quote.");
      }
      setFirmQuote(quote);
      setTransactionHash(submitted.orderHash);
      setPhase("submitted");
      setError(null);
      void refetchBalances();
      toast.success(
        `${input.side === "buy" ? "Buy" : "Sell"} submitted for ${detail.asset.symbol}.`
      );
      return quote;
    },
    [detail.asset.symbol, executeOneInchOrder, refetchBalances, wallet]
  );

  const execute = useCallback(
    async (side: TradeSide, amount: string) => {
      if (!ready) return;
      if (!authenticated) {
        await login();
        return;
      }
      if (!wallet || !isAddress(wallet)) {
        const message = "Your embedded EVM wallet is still being prepared. Try again shortly.";
        setError(message);
        setPhase("error");
        return;
      }
      if (!ethereumDeployment || !isAddress(ethereumDeployment.address)) {
        const message = "This asset is not available on Ethereum.";
        setError(message);
        setPhase("error");
        return;
      }
      if (side === "buy" && pendingBuy) {
        if (
          pendingBuy.version === 3 &&
          !pendingBuy.userOperationHash &&
          !pendingBuy.sourceTransactionHash
        ) {
          // The tab closed before Alchemy accepted the source operation. No
          // funds moved, so discard the orphaned intent and quote a new burn.
          clearPendingRwasPurchase(pendingBuy.requestId);
        } else {
          requestPendingRwasPurchaseRetry(pendingBuy.requestId);
          return;
        }
      }

      setError(null);
      setBlockedTrade(null);
      setFirmQuote(null);
      setTransactionHash(null);
      try {
        if (side === "sell") {
          const rawAmount = toBaseUnits(amount, ethereumDeployment.decimals);
          if (rawAmount <= 0n) throw new Error("Enter a valid token amount.");
          const held = await fetchErc20Balance(
            ETHEREUM_NETWORK,
            ethereumDeployment.address as Address,
            wallet as Address
          );
          if (held < rawAmount)
            throw new Error(`You do not have enough ${detail.asset.symbol} on Ethereum.`);
          await submitOrder({
            side,
            inputAmount: rawAmount,
            quoteAmount: formatUnits(rawAmount, ethereumDeployment.decimals),
          });
          return;
        }

        const requestedAmount = toBaseUnits(amount, USDC_BY_CHAIN.base.decimals);
        if (requestedAmount <= 0n) throw new Error("Enter a valid USDC amount.");
        const owner = wallet as Address;

        const baseBalance = await fetchErc20Balance(BASE_NETWORK, BASE_USDC_ADDRESS, owner);
        if (baseBalance < requestedAmount) throw new Error("You do not have enough Base USDC.");

        setPhase("quoting-route");
        const bridgeQuote = await fetchRwasCctpQuote({
          amount: requestedAmount.toString(),
          depositor: owner,
        });
        const minimumOrderAmount = toBaseUnits(detail.minimumAmountUsd ?? "1", USDC_DECIMALS);
        const minimumDeliveredAmount = BigInt(bridgeQuote.minOutputAmount);
        if (minimumOrderAmount > 0n && minimumDeliveredAmount < minimumOrderAmount) {
          throw new Error(
            `Circle would deliver about ${formatUnits(minimumDeliveredAmount, USDC_DECIMALS)} Ethereum USDC, below the ${formatUnits(minimumOrderAmount, USDC_DECIMALS)} USDC minimum for ${detail.asset.symbol}. Enter a larger amount.`
          );
        }

        // Validate the amount that can actually reach Ethereum, not the larger
        // Base input. Settlement still gets a fresh simulated quote because
        // executable venue calldata is short-lived.
        setPhase("checking-availability");
        const venueQuote = await fetchRwasOneInchQuote({
          symbol: detail.asset.symbol,
          side: "buy",
          amount: formatUnits(minimumDeliveredAmount, USDC_DECIMALS),
          walletAddress: owner,
        });
        if (!venueQuote.economicallyViable) {
          throw new Error(
            `The current 1inch route guarantees only ${venueQuote.minimumEffectiveRatePercent.toFixed(2)}% of market value. Enter a larger amount.`
          );
        }
        const startingEthereumUsdc = await fetchErc20Balance(
          ETHEREUM_NETWORK,
          ETHEREUM_USDC_ADDRESS,
          owner
        );
        const bridgeCalls = buildRwasCctpBurnCalls({ quote: bridgeQuote, depositor: owner });
        const pending: PendingRwasPurchase = {
          version: 3,
          provider: "cctp",
          requestId: bridgeQuote.id,
          walletAddress: owner,
          assetSymbol: detail.asset.symbol,
          assetAddress: ethereumDeployment.address as Address,
          requestedAmount: requestedAmount.toString(),
          expectedAmount: bridgeQuote.expectedOutputAmount,
          minimumAmount: bridgeQuote.minOutputAmount,
          startingEthereumUsdc: startingEthereumUsdc.toString(),
          userOperationHash: null,
          sourceTransactionHash: null,
          destinationUserOperationHash: null,
          destinationTransactionHash: null,
          destinationOperationKind: null,
          destinationOperationSubmittedAt: null,
          ethereumUsdcReceivedAt: null,
          settledAmount: null,
          orderUserOperationHash: null,
          expectedFillTime: bridgeQuote.expectedFillTime,
          createdAt: Date.now(),
        };
        savePendingRwasPurchase(pending);

        let submitted = false;
        setPhase("sending-base-usdc");
        let sourceTransactionHash: `0x${string}`;
        try {
          sourceTransactionHash = await sendBatch(bridgeCalls, BASE_CHAIN_ID, {
            onUserOperationSubmitted: (userOperationHash) => {
              submitted = true;
              savePendingRwasPurchase({ ...pending, userOperationHash });
            },
          });
        } catch (bridgeError) {
          if (!submitted) {
            clearPendingRwasPurchase(pending.requestId);
            throw bridgeError;
          }
          setPhase("idle");
          setError(null);
          toast.success(
            "Base USDC was submitted. The purchase will continue after Circle confirms it."
          );
          return;
        }

        savePendingRwasPurchase({ ...pending, sourceTransactionHash });
        setTransactionHash(sourceTransactionHash);
        setPhase("idle");
        void refetchBalances();
        toast.success("Base USDC sent. The purchase will continue automatically.");
      } catch (caught) {
        const message = errorMessage(caught);
        setBlockedTrade(tradeBlock(caught));
        setError(message);
        setPhase("error");
        toast.error(message);
      }
    },
    [
      authenticated,
      detail.minimumAmountUsd,
      detail.asset.symbol,
      ethereumDeployment,
      login,
      pendingBuy,
      ready,
      refetchBalances,
      sendBatch,
      submitOrder,
      wallet,
    ]
  );

  const visiblePhase = phase === "idle" && pendingBuy ? "bridging" : phase;
  const pendingBuyAmount = pendingBuy
    ? formatUnits(BigInt(pendingBuy.requestedAmount), USDC_DECIMALS)
    : null;
  const busy = [
    "checking-availability",
    "quoting-route",
    "sending-base-usdc",
    "approving-order",
    "preparing-order",
    "submitting-order",
  ].includes(visiblePhase);
  const statusMessage =
    visiblePhase === "checking-availability"
      ? "Checking the 1inch Fusion Ethereum route..."
      : visiblePhase === "quoting-route"
        ? "Checking Circle's fast USDC route..."
        : visiblePhase === "sending-base-usdc"
          ? "Sending Base USDC with sponsored gas..."
          : visiblePhase === "bridging"
            ? pendingBuyNeedsEthereumClaim
              ? "Circle confirmed the transfer. Claim the Ethereum USDC to continue."
              : pendingBuyClaimingEthereumUsdc
                ? "Claiming Ethereum USDC..."
                : pendingBuyHasEthereumUsdc
                  ? `Ethereum USDC is available. Retry the ${detail.asset.symbol} purchase without another Base transfer.`
                  : `Circle is confirming ${pendingBuyAmount ?? "your"} USDC. The ${detail.asset.symbol} purchase will continue automatically.`
            : visiblePhase === "approving-order"
              ? "Approving the asset for 1inch Fusion with sponsored gas..."
              : visiblePhase === "preparing-order"
                ? "Preparing a fresh 1inch Fusion order..."
                : visiblePhase === "submitting-order"
                  ? "Submitting the signed 1inch Fusion order..."
                  : visiblePhase === "submitted"
                    ? `1inch Fusion order accepted. Expected output: ${firmQuote ? executionAmount(firmQuote) : "pending"}.`
                    : null;

  return {
    execute,
    clearPendingBuy,
    busy,
    locked: busy,
    hasPendingBuy: pendingBuy !== null,
    pendingBuyNeedsEthereumClaim,
    pendingBuyClaimingEthereumUsdc,
    pendingBuyHasEthereumUsdc,
    pendingBuyAmount,
    error,
    blockedTrade,
    firmQuote,
    transactionHash,
    statusMessage,
    authenticated,
    walletAddress: wallet,
    baseUsdcBalance: balanceQuery.data?.baseUsdc ?? null,
    assetBalance: balanceQuery.data?.asset ?? null,
    balancesLoading: balanceQuery.isPending && balanceQuery.fetchStatus !== "idle",
    balancesError: balanceQuery.isError,
  };
}
