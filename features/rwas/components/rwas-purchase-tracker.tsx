"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { formatUnits, isAddress } from "viem";

import { useRwasOneInchOrder } from "@/features/rwas/hooks/use-rwas-oneinch-order";
import { fetchMarketAsset } from "@/features/rwas/lib/api";
import {
  fetchBaseUserOperationTransactionHash,
  fetchRwasAcrossStatus,
} from "@/features/rwas/lib/across";
import {
  buildRwasCctpReceiveCall,
  fetchCctpUserOperationReceipt,
  fetchRwasCctpMessageReceived,
  fetchRwasCctpStatus,
} from "@/features/rwas/lib/cctp";
import { fetchErc20Balance } from "@/features/rwas/lib/evm-balance";
import { fetchRwasOneInchOrderStatus } from "@/features/rwas/lib/oneinch";
import {
  confirmedBridgeSpend,
  ETHEREUM_CHAIN_ID,
  ETHEREUM_NETWORK,
  ETHEREUM_USDC_ADDRESS,
  USDC_DECIMALS,
} from "@/features/rwas/lib/ondo-order";
import {
  clearPendingRwasPurchase,
  isPendingRwasPurchaseActive,
  migrateLegacyPendingRwasPurchases,
  pendingRwasPurchasesSnapshot,
  savePendingRwasPurchase,
  serverPendingRwasPurchasesSnapshot,
  subscribePendingRwasPurchaseRetries,
  subscribePendingRwasPurchases,
  type CctpPendingRwasPurchase,
  type PendingRwasPurchase,
} from "@/features/rwas/lib/pending-purchase";
import { fetchDepositStatus } from "@/hooks/use-deposit";
import { useEvmSendBatch } from "@/hooks/use-evm-send";
import { recordSelfInitiated } from "@/lib/analytics/self-initiated";
import { errorCode } from "@/lib/api/envelope";
import { depositProgress } from "@/lib/deposit";
import { toast } from "@/lib/toast";
import { toBaseUnits } from "@/lib/trade/math";
import { getWalletAddress } from "@/lib/user";

const ACTIVE_RECONCILE_MS = 8_000;
const DESTINATION_OPERATION_STALE_MS = 2 * 60_000;
const PROVIDER_BACKOFF_MS = [30_000, 60_000, 120_000] as const;

function messageOf(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The final Ethereum trade could not be submitted.";
}

function isPermanentlyTooSmall(error: unknown): boolean {
  const code = errorCode(error);
  return code === "ORDER_TOO_SMALL" || code === "INVALID_NOTIONAL_VALUE";
}

function isWalletUnavailable(error: unknown): boolean {
  const message = messageOf(error);
  return message === "No EVM wallet is connected." || message === "No EVM wallet is connected";
}

export function RwasPurchaseTracker() {
  const { user } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const queryClient = useQueryClient();
  const sendBatch = useEvmSendBatch();
  const executeOneInchOrder = useRwasOneInchOrder();
  const executing = useRef(new Set<string>());
  const blocked = useRef(new Set<string>());
  const [retryVersion, setRetryVersion] = useState(0);
  const pending = useSyncExternalStore(
    subscribePendingRwasPurchases,
    pendingRwasPurchasesSnapshot,
    serverPendingRwasPurchasesSnapshot
  );
  const wallet = getWalletAddress(user, "ethereum");
  const embeddedWalletConnected = useMemo(
    () =>
      Boolean(
        wallet &&
        wallets.some(
          (connectedWallet) =>
            connectedWallet.walletClientType === "privy" &&
            connectedWallet.address.toLowerCase() === wallet.toLowerCase()
        )
      ),
    [wallet, wallets]
  );
  const matching = useMemo(
    () =>
      wallet
        ? pending.filter(
            (purchase) => purchase.walletAddress.toLowerCase() === wallet.toLowerCase()
          )
        : [],
    [pending, wallet]
  );

  useEffect(() => {
    migrateLegacyPendingRwasPurchases();
  }, []);

  useEffect(() => {
    for (const purchase of pending) {
      if (!isPendingRwasPurchaseActive(purchase, Date.now())) {
        clearPendingRwasPurchase(purchase.requestId);
      }
    }
  }, [pending]);

  useEffect(
    () =>
      subscribePendingRwasPurchaseRetries((requestId) => {
        blocked.current.delete(requestId);
        setRetryVersion((version) => version + 1);
      }),
    []
  );

  useEffect(() => {
    if (matching.length === 0 || !wallet || !isAddress(wallet)) return;
    let cancelled = false;
    let reconciling = false;
    let timer: number | null = null;
    let providerFailures = 0;

    const schedule = (delayMs: number) => {
      if (cancelled) return;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => void reconcile(), delayMs);
    };

    const completePurchase = async (
      purchase: Exclude<PendingRwasPurchase, CctpPendingRwasPurchase>
    ): Promise<boolean> => {
      const currentBalance = await fetchErc20Balance(
        ETHEREUM_NETWORK,
        ETHEREUM_USDC_ADDRESS,
        purchase.walletAddress
      );
      const startingBalance = BigInt(purchase.startingEthereumUsdc);
      const delivered = currentBalance > startingBalance ? currentBalance - startingBalance : 0n;
      if (delivered < BigInt(purchase.minimumAmount)) return false;

      const spend = confirmedBridgeSpend({
        startingBalance,
        currentBalance,
        requestedAmount: BigInt(purchase.requestedAmount),
        expectedAmount: BigInt(purchase.expectedAmount),
      });
      if (spend <= 0n) return false;
      if (!walletsReady || !embeddedWalletConnected) return true;
      if (executing.current.has(purchase.requestId) || blocked.current.has(purchase.requestId)) {
        return true;
      }

      executing.current.add(purchase.requestId);
      try {
        const detail = await fetchMarketAsset(purchase.assetSymbol);
        const minimumOrderAmount = toBaseUnits(detail.minimumAmountUsd ?? "1", USDC_DECIMALS);
        if (minimumOrderAmount > 0n && spend < minimumOrderAmount) {
          clearPendingRwasPurchase(purchase.requestId);
          await queryClient.invalidateQueries({ queryKey: ["rwas-trade-balances"] });
          toast.error(
            `Across delivered ${formatUnits(spend, USDC_DECIMALS)} Ethereum USDC, below the ${formatUnits(minimumOrderAmount, USDC_DECIMALS)} USDC minimum for ${purchase.assetSymbol}. No asset order was submitted; the USDC remains in your Ethereum wallet.`
          );
          return true;
        }

        const submitted = await executeOneInchOrder({
          symbol: purchase.assetSymbol,
          side: "buy",
          amount: formatUnits(spend, USDC_DECIMALS),
          walletAddress: purchase.walletAddress,
        });
        if (BigInt(submitted.quote.input.amount) !== spend) {
          throw new Error("The Ethereum quote amount changed. Request a fresh quote.");
        }
        clearPendingRwasPurchase(purchase.requestId);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["rwas-trade-balances"] }),
          queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
        ]);
        toast.success(`1inch Fusion order submitted for ${purchase.assetSymbol}.`);
        return true;
      } catch (error) {
        const message = messageOf(error);
        if (isPermanentlyTooSmall(error)) {
          clearPendingRwasPurchase(purchase.requestId);
          await queryClient.invalidateQueries({ queryKey: ["rwas-trade-balances"] });
          toast.error(
            `${message} No asset order was submitted; the Ethereum USDC remains in your wallet.`
          );
          return true;
        }
        blocked.current.add(purchase.requestId);
        toast.error(
          `${message} Your Ethereum USDC remains available. Select Continue purchase to retry without another bridge.`
        );
        return true;
      } finally {
        executing.current.delete(purchase.requestId);
      }
    };

    const completeCctpOrder = async (purchase: CctpPendingRwasPurchase): Promise<boolean> => {
      if (!purchase.settledAmount) return false;
      const spend = BigInt(purchase.settledAmount);
      if (spend <= 0n) return false;
      if (purchase.oneInchOrderHash) {
        const orderStatus = await fetchRwasOneInchOrderStatus(purchase.oneInchOrderHash);
        if (orderStatus.status === "pending" || orderStatus.status === "partially-filled") {
          return true;
        }
        if (orderStatus.status === "filled") {
          if (orderStatus.transactionHash) recordSelfInitiated([orderStatus.transactionHash]);
          clearPendingRwasPurchase(purchase.requestId);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["rwas-trade-balances"] }),
            queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
          ]);
          toast.success(`${purchase.assetSymbol} purchase filled through 1inch Fusion.`);
          return true;
        }
        savePendingRwasPurchase({
          ...purchase,
          oneInchOrderHash: null,
          oneInchOrderExpiresAt: null,
        });
        blocked.current.add(purchase.requestId);
        toast.error(
          `The 1inch Fusion order ${orderStatus.status.replaceAll("-", " ")}. Your Ethereum USDC remains available. Select Continue purchase to retry.`
        );
        return true;
      }
      const currentBalance = await fetchErc20Balance(
        ETHEREUM_NETWORK,
        ETHEREUM_USDC_ADDRESS,
        purchase.walletAddress
      );
      const reservedBalance = BigInt(purchase.startingEthereumUsdc) + spend;
      if (currentBalance < reservedBalance) {
        clearPendingRwasPurchase(purchase.requestId);
        await queryClient.invalidateQueries({ queryKey: ["rwas-trade-balances"] });
        toast.info(
          `The previous ${purchase.assetSymbol} purchase was cleared because its Ethereum USDC was moved from the wallet.`,
          { id: `rwas-purchase-cleared-${purchase.requestId}` }
        );
        return true;
      }
      if (!walletsReady || !embeddedWalletConnected) return false;
      if (executing.current.has(purchase.requestId) || blocked.current.has(purchase.requestId)) {
        return true;
      }

      executing.current.add(purchase.requestId);
      try {
        const detail = await fetchMarketAsset(purchase.assetSymbol);
        const minimumOrderAmount = toBaseUnits(detail.minimumAmountUsd ?? "1", USDC_DECIMALS);
        if (minimumOrderAmount > 0n && spend < minimumOrderAmount) {
          clearPendingRwasPurchase(purchase.requestId);
          await queryClient.invalidateQueries({ queryKey: ["rwas-trade-balances"] });
          toast.error(
            `Circle delivered ${formatUnits(spend, USDC_DECIMALS)} Ethereum USDC, below the ${formatUnits(minimumOrderAmount, USDC_DECIMALS)} USDC minimum for ${purchase.assetSymbol}. No asset order was submitted; the USDC is in your Ethereum wallet.`
          );
          return true;
        }

        const submitted = await executeOneInchOrder({
          symbol: purchase.assetSymbol,
          side: "buy",
          amount: formatUnits(spend, USDC_DECIMALS),
          walletAddress: purchase.walletAddress,
        });
        if (BigInt(submitted.quote.input.amount) !== spend) {
          throw new Error("The Ethereum quote amount changed. Request a fresh quote.");
        }
        savePendingRwasPurchase({
          ...purchase,
          oneInchOrderHash: submitted.orderHash as `0x${string}`,
          oneInchOrderExpiresAt: Date.parse(submitted.expiresAt),
        });
        toast.success(`1inch Fusion order submitted for ${purchase.assetSymbol}.`);
        return true;
      } catch (error) {
        if (isWalletUnavailable(error)) return false;
        const message = messageOf(error);
        if (isPermanentlyTooSmall(error)) {
          clearPendingRwasPurchase(purchase.requestId);
          await queryClient.invalidateQueries({ queryKey: ["rwas-trade-balances"] });
          toast.error(
            `${message} No asset order was submitted; the Ethereum USDC remains in your wallet.`
          );
          return true;
        }
        blocked.current.add(purchase.requestId);
        toast.error(
          `${message} Your Ethereum USDC remains available. Select Continue purchase to retry the order without another transfer.`
        );
        return true;
      } finally {
        executing.current.delete(purchase.requestId);
      }
    };

    const settleCctpPurchase = async (
      purchase: CctpPendingRwasPurchase,
      sourceTransactionHash: `0x${string}`
    ): Promise<void> => {
      const status = await fetchRwasCctpStatus({
        sourceTransactionHash,
        depositor: purchase.walletAddress,
        amount: purchase.requestedAmount,
      });
      if (status.status === "pending") return;

      const receive = buildRwasCctpReceiveCall({
        status,
        depositor: purchase.walletAddress,
        amount: BigInt(purchase.requestedAmount),
      });
      const settlingPurchase: CctpPendingRwasPurchase = {
        ...purchase,
        destinationOperationKind: "mint",
        settledAmount: receive.outputAmount.toString(),
      };
      if (
        purchase.destinationOperationKind !== "mint" ||
        purchase.settledAmount !== settlingPurchase.settledAmount
      ) {
        savePendingRwasPurchase(settlingPurchase);
      }

      const messageReceived = await fetchRwasCctpMessageReceived({
        message: status.message as `0x${string}`,
        depositor: purchase.walletAddress,
        amount: BigInt(purchase.requestedAmount),
      });
      if (messageReceived) {
        const receivedPurchase: CctpPendingRwasPurchase = {
          ...settlingPurchase,
          destinationUserOperationHash: null,
          destinationOperationSubmittedAt: null,
          ethereumUsdcReceivedAt: purchase.ethereumUsdcReceivedAt ?? Date.now(),
        };
        savePendingRwasPurchase(receivedPurchase);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["rwas-trade-balances"] }),
          queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
        ]);
        await completeCctpOrder(receivedPurchase);
        return;
      }

      // Iris status is public recovery state. Discover it even while Privy's
      // wallet list is hydrating, then wait for a wallet before asking the user
      // to sign the destination claim.
      if (!walletsReady || !embeddedWalletConnected) return;
      if (executing.current.has(purchase.requestId) || blocked.current.has(purchase.requestId)) {
        return;
      }
      executing.current.add(purchase.requestId);
      let destinationSubmitted = false;
      let settledPurchase: CctpPendingRwasPurchase | null = null;
      try {
        // Claim CCTP first. A short-lived or reverting venue quote must never
        // strand an already-attested transfer between Base and Ethereum.
        const hash = await sendBatch([{ to: receive.to, data: receive.data }], ETHEREUM_CHAIN_ID, {
          onUserOperationSubmitted: (destinationUserOperationHash) => {
            destinationSubmitted = true;
            savePendingRwasPurchase({
              ...settlingPurchase,
              destinationUserOperationHash,
              destinationTransactionHash: null,
              destinationOperationSubmittedAt: Date.now(),
              ethereumUsdcReceivedAt: null,
            });
          },
        });
        recordSelfInitiated([hash]);
        settledPurchase = {
          ...settlingPurchase,
          destinationUserOperationHash: null,
          destinationTransactionHash: hash,
          destinationOperationSubmittedAt: null,
          ethereumUsdcReceivedAt: Date.now(),
        };
        savePendingRwasPurchase(settledPurchase);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["rwas-trade-balances"] }),
          queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
        ]);
        toast.success("Ethereum USDC received. Preparing the asset order.");
      } catch (error) {
        // Once Alchemy has accepted the destination user operation, never send
        // another one until its receipt has been reconciled below.
        if (destinationSubmitted) return;
        if (isWalletUnavailable(error)) return;
        blocked.current.add(purchase.requestId);
        toast.error(
          `${messageOf(error)} Select Continue purchase to claim the Ethereum USDC. No second Base transfer is required.`
        );
      } finally {
        executing.current.delete(purchase.requestId);
      }
      if (settledPurchase) await completeCctpOrder(settledPurchase);
    };

    // Ethereum is the source of truth for legacy deposit rails. Provider status is only consulted when
    // the delivered balance is not visible yet, so an unavailable indexer
    // cannot strand an already funded purchase.
    const reconcile = async () => {
      if (cancelled || reconciling || document.visibilityState === "hidden" || !navigator.onLine) {
        return;
      }
      reconciling = true;
      let nextDelay = ACTIVE_RECONCILE_MS;
      try {
        for (const purchase of matching) {
          if (cancelled || !isPendingRwasPurchaseActive(purchase, Date.now())) continue;
          try {
            if (purchase.version === 3) {
              if (purchase.orderUserOperationHash) {
                const receipt = await fetchCctpUserOperationReceipt(
                  "eth-mainnet",
                  purchase.orderUserOperationHash
                );
                if (receipt.state === "pending") continue;
                if (receipt.state === "failed") {
                  savePendingRwasPurchase({ ...purchase, orderUserOperationHash: null });
                  blocked.current.add(purchase.requestId);
                  toast.error(
                    "The Ethereum trade failed, but the USDC is available. Select Continue purchase to retry."
                  );
                  continue;
                }
                if (receipt.transactionHash) recordSelfInitiated([receipt.transactionHash]);
                clearPendingRwasPurchase(purchase.requestId);
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ["rwas-trade-balances"] }),
                  queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
                ]);
                toast.success(`Buy order submitted for ${purchase.assetSymbol}.`);
                continue;
              }

              if (purchase.destinationUserOperationHash) {
                // Records created by the previous implementation omitted this
                // discriminator because receiveMessage and the asset trade were
                // submitted atomically.
                const operationKind = purchase.destinationOperationKind ?? "atomic";
                const receipt = await fetchCctpUserOperationReceipt(
                  "eth-mainnet",
                  purchase.destinationUserOperationHash
                );
                if (receipt.state === "pending") {
                  if (!purchase.sourceTransactionHash || !purchase.settledAmount) continue;
                  const status = await fetchRwasCctpStatus({
                    sourceTransactionHash: purchase.sourceTransactionHash,
                    depositor: purchase.walletAddress,
                    amount: purchase.requestedAmount,
                  });
                  if (status.status === "pending") continue;
                  const messageReceived = await fetchRwasCctpMessageReceived({
                    message: status.message as `0x${string}`,
                    depositor: purchase.walletAddress,
                    amount: BigInt(purchase.requestedAmount),
                  });
                  if (!messageReceived) {
                    const submittedAt =
                      purchase.destinationOperationSubmittedAt ?? purchase.createdAt;
                    if (Date.now() - submittedAt >= DESTINATION_OPERATION_STALE_MS) {
                      savePendingRwasPurchase({
                        ...purchase,
                        destinationUserOperationHash: null,
                        destinationTransactionHash: null,
                        destinationOperationKind: null,
                        destinationOperationSubmittedAt: null,
                        ethereumUsdcReceivedAt: null,
                      });
                      blocked.current.add(purchase.requestId);
                      toast.info(
                        "The previous Ethereum claim expired. Your Circle transfer is ready to claim again."
                      );
                    }
                    continue;
                  }
                  if (operationKind === "atomic") {
                    clearPendingRwasPurchase(purchase.requestId);
                    await Promise.all([
                      queryClient.invalidateQueries({ queryKey: ["rwas-trade-balances"] }),
                      queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
                    ]);
                    toast.success(`Buy order submitted for ${purchase.assetSymbol}.`);
                    continue;
                  }
                  const settledPurchase: CctpPendingRwasPurchase = {
                    ...purchase,
                    destinationUserOperationHash: null,
                    destinationTransactionHash: null,
                    destinationOperationKind: "mint",
                    destinationOperationSubmittedAt: null,
                    ethereumUsdcReceivedAt: purchase.ethereumUsdcReceivedAt ?? Date.now(),
                  };
                  savePendingRwasPurchase(settledPurchase);
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ["rwas-trade-balances"] }),
                    queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
                  ]);
                  await completeCctpOrder(settledPurchase);
                  continue;
                }
                if (receipt.state === "failed") {
                  savePendingRwasPurchase({
                    ...purchase,
                    destinationUserOperationHash: null,
                    destinationTransactionHash: null,
                    destinationOperationKind: null,
                    destinationOperationSubmittedAt: null,
                    ethereumUsdcReceivedAt: null,
                    settledAmount: operationKind === "mint" ? purchase.settledAmount : null,
                  });
                  blocked.current.add(purchase.requestId);
                  toast.error(
                    operationKind === "atomic"
                      ? "The combined Ethereum transaction failed. Select Continue purchase to retry it; no second Base transfer is required."
                      : "The Ethereum USDC settlement failed. Select Continue purchase to retry; no second Base transfer is required."
                  );
                  continue;
                }
                if (receipt.transactionHash) recordSelfInitiated([receipt.transactionHash]);
                if (operationKind === "atomic") {
                  clearPendingRwasPurchase(purchase.requestId);
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ["rwas-trade-balances"] }),
                    queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
                  ]);
                  toast.success(`Buy order submitted for ${purchase.assetSymbol}.`);
                  continue;
                }
                if (!receipt.transactionHash) continue;
                const settledPurchase: CctpPendingRwasPurchase = {
                  ...purchase,
                  destinationUserOperationHash: null,
                  destinationTransactionHash: receipt.transactionHash,
                  destinationOperationKind: "mint",
                  destinationOperationSubmittedAt: null,
                  ethereumUsdcReceivedAt: purchase.ethereumUsdcReceivedAt ?? Date.now(),
                };
                savePendingRwasPurchase(settledPurchase);
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ["rwas-trade-balances"] }),
                  queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
                ]);
                await completeCctpOrder(settledPurchase);
                continue;
              }

              if (purchase.destinationTransactionHash) {
                await completeCctpOrder(purchase);
                continue;
              }

              if (
                purchase.destinationOperationKind === "mint" &&
                purchase.settledAmount &&
                purchase.ethereumUsdcReceivedAt
              ) {
                await completeCctpOrder(purchase);
                continue;
              }

              let sourceTransactionHash = purchase.sourceTransactionHash;
              if (!sourceTransactionHash && purchase.userOperationHash) {
                const receipt = await fetchCctpUserOperationReceipt(
                  "base-mainnet",
                  purchase.userOperationHash
                );
                if (receipt.state === "pending") continue;
                if (receipt.state === "failed") {
                  clearPendingRwasPurchase(purchase.requestId);
                  toast.error("The Base USDC transfer failed. No asset trade was submitted.");
                  continue;
                }
                sourceTransactionHash = receipt.transactionHash;
                if (sourceTransactionHash) {
                  savePendingRwasPurchase({ ...purchase, sourceTransactionHash });
                  recordSelfInitiated([sourceTransactionHash]);
                }
              }
              if (!sourceTransactionHash) continue;
              await settleCctpPurchase(
                { ...purchase, sourceTransactionHash },
                sourceTransactionHash
              );
              continue;
            }

            let acrossSourceTransactionHash: `0x${string}` | null = null;
            if (purchase.version === 2) {
              acrossSourceTransactionHash = purchase.sourceTransactionHash;
              if (!acrossSourceTransactionHash && purchase.userOperationHash) {
                acrossSourceTransactionHash = await fetchBaseUserOperationTransactionHash(
                  purchase.userOperationHash
                );
                if (acrossSourceTransactionHash) {
                  savePendingRwasPurchase({
                    ...purchase,
                    sourceTransactionHash: acrossSourceTransactionHash,
                  });
                  recordSelfInitiated([acrossSourceTransactionHash]);
                }
              }
              // Do not interpret an unrelated Ethereum USDC deposit as this
              // purchase until the sponsored Base operation is onchain.
              if (!acrossSourceTransactionHash) continue;
            }

            if (await completePurchase(purchase)) continue;

            if (purchase.version === 2) {
              if (!acrossSourceTransactionHash) continue;
              const status = await fetchRwasAcrossStatus(acrossSourceTransactionHash);
              recordSelfInitiated(
                [status.fillTxnRef, status.refundTxnRef].filter(
                  (hash): hash is `0x${string}` => hash !== null
                )
              );
              if (status.status === "refunded") {
                clearPendingRwasPurchase(purchase.requestId);
                toast.error(
                  "The Across transfer was refunded to Base. No asset trade was submitted."
                );
              }
              continue;
            }

            const status = await fetchDepositStatus(purchase.requestId, "trade");
            recordSelfInitiated(status.destinationTransactionHashes);
            if (status.providerUnavailable) {
              providerFailures += 1;
              nextDelay = Math.max(
                status.retryAfterMs ?? 0,
                PROVIDER_BACKOFF_MS[Math.min(providerFailures - 1, PROVIDER_BACKOFF_MS.length - 1)]
              );
              break;
            }

            providerFailures = 0;
            const { stage } = depositProgress(status.status, status.executionStatus);
            if (stage === "failed" || stage === "refunded") {
              clearPendingRwasPurchase(purchase.requestId);
              toast.error(
                stage === "refunded"
                  ? "The bridge was refunded to Base. No asset trade was submitted."
                  : "The Base USDC bridge failed. No asset trade was submitted."
              );
            }
          } catch (error) {
            if (purchase.version === 3 && errorCode(error) === "CCTP_MESSAGE_MISMATCH") {
              blocked.current.add(purchase.requestId);
              toast.error(messageOf(error));
              continue;
            }
            providerFailures += 1;
            nextDelay =
              PROVIDER_BACKOFF_MS[Math.min(providerFailures - 1, PROVIDER_BACKOFF_MS.length - 1)];
            break;
          }
        }
      } finally {
        reconciling = false;
        schedule(nextDelay);
      }
    };

    const wake = () => {
      if (document.visibilityState === "visible" && navigator.onLine) schedule(0);
    };
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    schedule(0);
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [
    embeddedWalletConnected,
    executeOneInchOrder,
    matching,
    queryClient,
    retryVersion,
    sendBatch,
    wallet,
    walletsReady,
  ]);

  return null;
}
