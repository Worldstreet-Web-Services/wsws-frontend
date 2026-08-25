import { createServiceClient } from "@/lib/api/service";
import type {
  DepositAddress,
  DepositStatus,
  HlAllMids,
  HlApproveBuilderFeeAction,
  HlAsset,
  HlBuilderFeeStatus,
  HlClearinghouseState,
  HlClosedPositionView,
  HlL1Action,
  HlMarketContext,
  HlOrderRow,
  HlPositionView,
  HlSignature,
  HlTriggerKind,
  HlWallet,
  HlWithdraw3Action,
  PlaceOrderRequest,
  PlaceOrderResult,
  PrepareBridgeResult,
  PrepareLeverageResult,
  PreparedBuilderFeeApproval,
  PreparedCancel,
  PreparedClosePosition,
  PreparedOrder,
  PreparedTriggerOrder,
  PreparedWithdrawal,
} from "@/features/trade/lib/hyperliquid-types";

// Same BFF proxy the legacy Avantis perp client uses (app/api/perp/[...path]/route.ts) —
// it is the SAME backend service, just the new /hl/* sub-paths. One transport,
// per this app's architecture rules.
const perp = createServiceClient("/api/perp", "The perp service is unavailable right now.");

export async function getOrCreateWallet(address: string): Promise<HlWallet> {
  return perp.authedGet<HlWallet>(`/hl/wallet/${address}`);
}

export async function listAssets(): Promise<HlAsset[]> {
  return perp.get<HlAsset[]>("/hl/assets");
}

export async function getPrices(): Promise<HlAllMids> {
  return perp.get<HlAllMids>("/hl/prices");
}

export async function getMarketContexts(): Promise<HlMarketContext[]> {
  return perp.get<HlMarketContext[]>("/hl/market-contexts");
}

export async function getClearinghouseState(address: string): Promise<HlClearinghouseState> {
  return perp.authedGet<HlClearinghouseState>(`/hl/clearinghouse/${address}`);
}

// Reads the destination chain directly rather than the Dextopus-webhook-driven
// treasury ledger — used to confirm a Base deposit actually landed, since a
// webhook can be missed, delayed, or (in local development) unreachable.
export async function getArbitrumBalance(address: string): Promise<string> {
  const { balance } = await perp.authedGet<{ balance: string }>(`/hl/arbitrum-balance/${address}`);
  return balance;
}

export async function listPositions(walletId: string): Promise<HlPositionView[]> {
  return perp.get<HlPositionView[]>(`/hl/wallets/${walletId}/positions`);
}

export async function listOrders(walletId: string): Promise<HlOrderRow[]> {
  return perp.get<HlOrderRow[]>(`/hl/wallets/${walletId}/orders`);
}

// Closed positions only — trading history. Kept off listPositions above so
// an open-positions poll never pages through history it doesn't need.
export async function listClosedPositions(
  walletId: string,
  limit = 50,
  offset = 0
): Promise<HlClosedPositionView[]> {
  return perp.get<HlClosedPositionView[]>(`/hl/wallets/${walletId}/positions/closed`, {
    limit,
    offset,
  });
}

export async function prepareOrder(request: PlaceOrderRequest): Promise<PreparedOrder> {
  return perp.post<PreparedOrder>("/hl/orders/prepare", request);
}

export async function submitOrder(
  walletId: string,
  prepared: PreparedOrder,
  signature: HlSignature
): Promise<PlaceOrderResult> {
  return perp.post<PlaceOrderResult>("/hl/orders/submit", { walletId, prepared, signature });
}

export async function prepareLeverageUpdate(
  walletId: string,
  assetSymbol: string,
  leverage: number,
  marginMode: "isolated" | "cross"
): Promise<PrepareLeverageResult> {
  return perp.post<PrepareLeverageResult>("/hl/leverage/prepare", {
    walletId,
    assetSymbol,
    leverage,
    marginMode,
  });
}

export async function submitLeverageUpdate(
  walletId: string,
  action: HlL1Action,
  nonce: number,
  signature: HlSignature
): Promise<{ updated: true }> {
  return perp.post<{ updated: true }>("/hl/leverage/submit", {
    walletId,
    action,
    nonce,
    signature,
  });
}

export async function prepareCancelOrder(
  walletId: string,
  orderId: string
): Promise<PreparedCancel> {
  return perp.post<PreparedCancel>("/hl/orders/cancel/prepare", { walletId, orderId });
}

export async function submitCancelOrder(
  walletId: string,
  prepared: PreparedCancel,
  signature: HlSignature
): Promise<HlOrderRow> {
  return perp.post<HlOrderRow>("/hl/orders/cancel/submit", { walletId, prepared, signature });
}

export async function prepareClosePosition(
  walletId: string,
  positionId: string,
  size?: string
): Promise<PreparedClosePosition> {
  return perp.post<PreparedClosePosition>("/hl/positions/close/prepare", {
    walletId,
    positionId,
    size,
  });
}

export async function submitClosePosition(
  walletId: string,
  prepared: PreparedClosePosition,
  signature: HlSignature
): Promise<{ closeOrder: HlOrderRow }> {
  return perp.post<{ closeOrder: HlOrderRow }>("/hl/positions/close/submit", {
    walletId,
    prepared,
    signature,
  });
}

export async function prepareTriggerOrder(
  walletId: string,
  positionId: string,
  kind: HlTriggerKind,
  triggerPrice: string
): Promise<PreparedTriggerOrder> {
  return perp.post<PreparedTriggerOrder>("/hl/orders/trigger/prepare", {
    walletId,
    positionId,
    kind,
    triggerPrice,
  });
}

export async function submitTriggerOrder(
  walletId: string,
  prepared: PreparedTriggerOrder,
  signature: HlSignature
): Promise<HlOrderRow> {
  return perp.post<HlOrderRow>("/hl/orders/trigger/submit", { walletId, prepared, signature });
}

export async function prepareBridge(
  walletId: string,
  requiredUsdc: string
): Promise<PrepareBridgeResult> {
  return perp.post<PrepareBridgeResult>("/hl/bridge/prepare", { walletId, requiredUsdc });
}

export async function confirmBridge(
  walletId: string,
  txHash: string,
  amountUsdc: string
): Promise<{ treasuryMovementId: string }> {
  return perp.post<{ treasuryMovementId: string }>("/hl/bridge/confirm", {
    walletId,
    txHash,
    amountUsdc,
  });
}

export async function prepareWithdrawal(
  walletId: string,
  amountUsdc: string
): Promise<PreparedWithdrawal> {
  return perp.post<PreparedWithdrawal>("/hl/withdrawals/prepare", { walletId, amountUsdc });
}

export async function submitWithdrawal(
  walletId: string,
  action: HlWithdraw3Action,
  signature: HlSignature
): Promise<{ treasuryMovementId: string }> {
  return perp.post<{ treasuryMovementId: string }>("/hl/withdrawals/submit", {
    walletId,
    action,
    signature,
  });
}

// ── Builder fee (Hyperliquid's own revenue-collection mechanism) ────────

export async function getBuilderFeeStatus(walletId: string): Promise<HlBuilderFeeStatus> {
  return perp.get<HlBuilderFeeStatus>(`/hl/wallets/${walletId}/builder-fee`);
}

export async function prepareBuilderFeeApproval(
  walletId: string
): Promise<PreparedBuilderFeeApproval> {
  return perp.post<PreparedBuilderFeeApproval>("/hl/builder-fee/prepare", { walletId });
}

export async function submitBuilderFeeApproval(
  walletId: string,
  action: HlApproveBuilderFeeAction,
  signature: HlSignature
): Promise<{ approved: true }> {
  return perp.post<{ approved: true }>("/hl/builder-fee/submit", { walletId, action, signature });
}

// ── Dextopus funding (Base -> Arbitrum) ──────────────────────────────────

export async function getDepositAddress(address: string): Promise<DepositAddress> {
  return perp.authedGet<DepositAddress>(`/funding/deposit-address/${address}`);
}

// `data: null` (no matching movement recorded yet) reads as "still pending",
// not an error — the caller's own tx hash existing is not in question, only
// whether the webhook has landed and been processed yet.
export async function getDepositStatus(txHash: string): Promise<DepositStatus | null> {
  return perp.authedGet<DepositStatus | null>(`/funding/deposit-status/${txHash}`);
}
