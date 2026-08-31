"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { OrderSide, OrderType } from "@polymarket/client";
import { fetchNegRisk } from "@polymarket/client/actions";
import { usePolymarketSession } from "@/features/prediction/hooks/use-polymarket-session";
import { usePolymarketFunding } from "@/features/prediction/hooks/use-polymarket-funding";
import { ensureNegRiskBuyAllowance } from "@/features/prediction/lib/polymarket/allowance";
import {
  readCollateralUsd,
  waitForCollateralUsd,
} from "@/features/prediction/lib/polymarket/collateral";
import type { SecureClient } from "@/features/prediction/lib/polymarket/secure-client";
import { friendlyError } from "@/lib/errors";
import { persistSinglesTicket } from "../api";
import { MAX_SINGLE_SELECTIONS, parseUsdE6, type MarketSlipSelection } from "../bet-slip";
import {
  clearMarketSlipSubmissionReview,
  requireMarketSlipSubmissionReview,
  usePersistedMarketSlip,
} from "../market-slip-storage";
import { createSinglesBetReceipt, type SinglesOrderResult } from "../singles-receipt";
import {
  clearStoredReceipt,
  updateStoredReceipt,
  useStoredReceipt,
  writeStoredReceipt,
} from "../singles-receipt-storage";

export type SinglesOrderPhase =
  "idle" | "connecting" | "funding" | "settling" | "checking" | "approving" | "signing" | "placing";

const MAX_PRICE_SLIPPAGE = 0.03;
const MIN_MARKET_BUY_AMOUNT_E6 = 1_000_000n;
const MIN_BRIDGE_DEPOSIT_USD = 2;
type SignedMarketOrder = Awaited<ReturnType<SecureClient["createMarketOrder"]>>;

interface MinimumOrderBook {
  asks: ReadonlyArray<{ price: string; size: string }>;
  minOrderSize: string;
}

class SinglesOrderValidationError extends Error {}

function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - 1n) / denominator;
}

export function minimumBuyStakeE6(book: MinimumOrderBook, maxPrice: string): bigint | null {
  const minimumSharesE6 = parseUsdE6(book.minOrderSize);
  const maxPriceE6 = parseUsdE6(maxPrice);
  if (!minimumSharesE6 || !maxPriceE6) return null;

  let sharesRemaining = minimumSharesE6;
  let costE6 = 0n;
  for (let index = book.asks.length - 1; index >= 0 && sharesRemaining > 0n; index -= 1) {
    const level = book.asks[index];
    if (!level) continue;
    const priceE6 = parseUsdE6(level.price);
    const availableSharesE6 = parseUsdE6(level.size);
    if (!priceE6 || !availableSharesE6 || priceE6 > maxPriceE6) continue;
    const sharesE6 = availableSharesE6 < sharesRemaining ? availableSharesE6 : sharesRemaining;
    costE6 += ceilDiv(priceE6 * sharesE6, 1_000_000n);
    sharesRemaining -= sharesE6;
  }
  return sharesRemaining === 0n ? costE6 : null;
}

export function formatMinimumStakeE6(value: bigint): string {
  return `$${e6ToDecimal(value)}`;
}

export function requiredPredictionDepositUsd(requiredUsd: number, availableUsd: number): number {
  if (availableUsd >= requiredUsd) return 0;
  const shortfall = Math.ceil((requiredUsd - availableUsd) * 100) / 100;
  return Math.max(shortfall, MIN_BRIDGE_DEPOSIT_USD);
}

export function minimumPreparedBuyStakeE6(input: {
  stakeE6: bigint;
  makerAmountE6: bigint;
  takerAmountE6: bigint;
  minimumSharesE6: bigint | null;
}): bigint {
  let requiredStakeE6 = MIN_MARKET_BUY_AMOUNT_E6;
  if (input.makerAmountE6 > 0n && input.makerAmountE6 < MIN_MARKET_BUY_AMOUNT_E6) {
    requiredStakeE6 = ceilDiv(input.stakeE6 * MIN_MARKET_BUY_AMOUNT_E6, input.makerAmountE6);
  }
  if (
    input.minimumSharesE6 &&
    input.takerAmountE6 > 0n &&
    input.takerAmountE6 < input.minimumSharesE6
  ) {
    const requiredForShares = ceilDiv(input.stakeE6 * input.minimumSharesE6, input.takerAmountE6);
    if (requiredForShares > requiredStakeE6) requiredStakeE6 = requiredForShares;
  }
  return requiredStakeE6;
}

export function isDefinitePostOrdersFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: unknown; status?: unknown };
  if (
    candidate.name === "UserInputError" ||
    candidate.name === "SigningError" ||
    candidate.name === "RateLimitError"
  ) {
    return true;
  }
  return (
    candidate.name === "RequestRejectedError" &&
    typeof candidate.status === "number" &&
    candidate.status >= 400 &&
    candidate.status < 500 &&
    candidate.status !== 408
  );
}

function e6ToDecimal(value: bigint): string {
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, "0").replace(/0+$/u, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function singlesMaxBuyPrice(decimalOdds: number): string {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) return "0.99";
  const referencePrice = 1 / decimalOdds;
  return Math.min(0.99, Math.max(0.01, referencePrice * (1 + MAX_PRICE_SLIPPAGE))).toFixed(4);
}

export function useSinglesBatchOrder() {
  const { user } = usePrivy();
  const { ensureReady, status: sessionStatus } = usePolymarketSession();
  const { fund, usdcTotal, portfolioLoading } = usePolymarketFunding();
  const [phase, setPhase] = useState<SinglesOrderPhase>("idle");
  const [preparedCount, setPreparedCount] = useState(0);
  const { submissionReview } = usePersistedMarketSlip();
  const receipt = useStoredReceipt(user?.id ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !receipt || receipt.persistence !== "saving") return;
    let live = true;
    void persistSinglesTicket(receipt)
      .then(() => {
        if (!live) return;
        updateStoredReceipt(user.id, (current) =>
          current.bookingCode === receipt.bookingCode
            ? { ...current, persistence: "saved", saveError: null }
            : current
        );
      })
      .catch((cause) => {
        if (!live) return;
        updateStoredReceipt(user.id, (current) =>
          current.bookingCode === receipt.bookingCode
            ? {
                ...current,
                persistence: "unsaved",
                saveError: friendlyError(cause, "Ark could not save this ticket receipt."),
              }
            : current
        );
      });
    return () => {
      live = false;
    };
  }, [receipt, user?.id]);

  async function placeBets(selections: MarketSlipSelection[], stakeE6: bigint) {
    if (submissionReview) {
      const cause = new Error("Review the previous order attempt before placing more bets.");
      setError(cause.message);
      throw cause;
    }
    if (selections.length < 1 || selections.length > MAX_SINGLE_SELECTIONS) {
      throw new Error(`Select between 1 and ${MAX_SINGLE_SELECTIONS} markets.`);
    }
    if (stakeE6 <= 0n) throw new Error("Enter a valid stake per selection.");
    if (stakeE6 < MIN_MARKET_BUY_AMOUNT_E6) {
      const cause = new SinglesOrderValidationError(
        "Polymarket requires at least $1.00 per selection for market BUY orders."
      );
      setError(cause.message);
      throw cause;
    }
    if (new Set(selections.map(({ tokenId }) => tokenId)).size !== selections.length) {
      throw new Error("Each selected market must be unique.");
    }

    setError(null);
    if (user?.id) clearStoredReceipt(user.id);
    setPreparedCount(0);
    setPhase("connecting");
    let submissionStarted = false;

    try {
      const client = await ensureReady();
      const amount = e6ToDecimal(stakeE6);

      setPhase("checking");
      const [books, negRiskFlags] = await Promise.all([
        client.fetchOrderBooks(selections.map(({ tokenId }) => ({ tokenId }))),
        Promise.all(selections.map(({ tokenId }) => fetchNegRisk(client, { tokenId }))),
      ]);
      const booksByTokenId = new Map<string, (typeof books)[number]>(
        books.map((book) => [String(book.tokenId), book])
      );
      const minimumStakeE6 = selections.reduce((required, selection) => {
        const book = booksByTokenId.get(selection.tokenId);
        if (!book) return required;
        const minimum = minimumBuyStakeE6(book, singlesMaxBuyPrice(selection.decimalOdds));
        return minimum && minimum > required ? minimum : required;
      }, 0n);
      if (minimumStakeE6 > stakeE6) {
        throw new SinglesOrderValidationError(
          `Stake per selection is below a selected market's minimum. Enter at least ${formatMinimumStakeE6(minimumStakeE6)}.`
        );
      }

      const requiredUsd = Number(stakeE6 * BigInt(selections.length)) / 1_000_000;
      if (!Number.isFinite(requiredUsd)) {
        throw new SinglesOrderValidationError("The total stake is too large.");
      }

      let availableUsd = await readCollateralUsd(client);
      const depositUsd = requiredPredictionDepositUsd(requiredUsd, availableUsd);
      if (depositUsd > 0) {
        if (!portfolioLoading && usdcTotal < depositUsd) {
          throw new SinglesOrderValidationError(
            `You need at least $${depositUsd.toFixed(2)} USDC on Base, but have $${usdcTotal.toFixed(2)}. Add USDC first.`
          );
        }
      }

      const negRiskOrderCount = negRiskFlags.filter(Boolean).length;
      if (negRiskOrderCount > 0) {
        setPhase("approving");
        await ensureNegRiskBuyAllowance(client, stakeE6 * BigInt(negRiskOrderCount));
      }

      if (depositUsd > 0) {
        setPhase("funding");
        await fund(depositUsd);

        setPhase("settling");
        availableUsd = await waitForCollateralUsd(client, requiredUsd, {
          initialAvailableUsd: availableUsd,
        });
        if (availableUsd < requiredUsd) {
          throw new SinglesOrderValidationError(
            "Your Base transfer succeeded, but the Polygon pUSD credit is still pending. It will remain available for the next attempt."
          );
        }
      }

      const prepared: Array<{
        index: number;
        selection: MarketSlipSelection;
        order: SignedMarketOrder;
      }> = [];
      const results: Array<SinglesOrderResult | null> = selections.map(() => null);
      let preparedMinimumStakeE6 = MIN_MARKET_BUY_AMOUNT_E6;

      setPhase("signing");
      for (const [index, selection] of selections.entries()) {
        try {
          const order = await client.createMarketOrder({
            tokenId: selection.tokenId,
            side: OrderSide.BUY,
            amount,
            maxSpend: amount,
            maxPrice: singlesMaxBuyPrice(selection.decimalOdds),
            orderType: OrderType.FOK,
          });
          const minimumSharesE6 = parseUsdE6(
            booksByTokenId.get(selection.tokenId)?.minOrderSize ?? ""
          );
          const requiredStakeE6 = minimumPreparedBuyStakeE6({
            stakeE6,
            makerAmountE6: BigInt(order.makerAmount),
            takerAmountE6: BigInt(order.takerAmount),
            minimumSharesE6,
          });
          if (requiredStakeE6 > preparedMinimumStakeE6) {
            preparedMinimumStakeE6 = requiredStakeE6;
          }
          prepared.push({ index, selection, order });
        } catch (cause) {
          results[index] = {
            selection,
            error: friendlyError(cause, "This order could not be prepared."),
          };
        }
        setPreparedCount(index + 1);
      }

      if (preparedMinimumStakeE6 > stakeE6) {
        throw new SinglesOrderValidationError(
          `Stake per selection is below a selected market's executable minimum. Enter at least ${formatMinimumStakeE6(preparedMinimumStakeE6)}.`
        );
      }

      if (prepared.length > 0) {
        setPhase("placing");
        submissionStarted = true;
        const responses = await client.postOrders(prepared.map(({ order }) => order));
        clearMarketSlipSubmissionReview();
        for (const [responseIndex, item] of prepared.entries()) {
          const response = responses[responseIndex];
          results[item.index] = response
            ? { selection: item.selection, response }
            : { selection: item.selection, error: "Polymarket did not return an order result." };
        }
      }

      const nextReceipt = createSinglesBetReceipt({
        bookingSeed: globalThis.crypto.randomUUID(),
        results: results.map(
          (result, index): SinglesOrderResult =>
            result ?? {
              selection: selections[index],
              error: "This order was not submitted.",
            }
        ),
        stakeE6,
      });
      if (user?.id) writeStoredReceipt(user.id, nextReceipt);
      return nextReceipt;
    } catch (cause) {
      const uncertain = submissionStarted && !isDefinitePostOrdersFailure(cause);
      if (uncertain) {
        requireMarketSlipSubmissionReview(selections.map(({ id }) => id));
      } else {
        clearMarketSlipSubmissionReview();
      }
      const message = uncertain
        ? "Order submission was interrupted. Review your active bets before trying again."
        : cause instanceof SinglesOrderValidationError
          ? cause.message
          : friendlyError(cause, "Couldn't place these bets. Try again.");
      setError(message);
      throw cause;
    } finally {
      setPhase("idle");
      setPreparedCount(0);
    }
  }

  return {
    placeBets,
    phase,
    preparedCount,
    sessionStatus,
    receipt,
    retryReceiptSave: () => {
      if (!user?.id || !receipt || receipt.persistence !== "unsaved") return;
      updateStoredReceipt(user.id, (current) =>
        current.bookingCode === receipt.bookingCode
          ? { ...current, persistence: "saving", saveError: null }
          : current
      );
    },
    reconciliationRequired: submissionReview !== null,
    acknowledgeSubmissionReview: () => {
      clearMarketSlipSubmissionReview();
      setError(null);
    },
    dismissReceipt: () => {
      if (user?.id) clearStoredReceipt(user.id);
    },
    error,
  };
}
