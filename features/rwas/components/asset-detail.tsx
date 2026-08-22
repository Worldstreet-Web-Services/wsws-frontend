"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  AreaSeries,
  ColorType,
  createChart,
  LineStyle,
  TickMarkType,
  type AreaData,
  type IChartApi,
  type MouseEventParams,
  type Time,
} from "lightweight-charts";
import { formatUnits } from "viem";

import { useRwasTrade } from "@/features/rwas/hooks/use-rwas-trade";
import { fetchRwasOneInchQuote } from "@/features/rwas/lib/oneinch";
import { ETHEREUM_CHAIN_ID, USDC_DECIMALS } from "@/features/rwas/lib/ondo-order";
import {
  fetchCoinGeckoMarketAssetHistory,
  fetchMarketAsset,
  fetchMarketAssetHistory,
  fetchMarketAssetQuote,
  MARKET_ASSET_CHART_RANGES,
  type MarketAssetChartHistory,
  type MarketAssetChartRange,
} from "@/features/rwas/lib/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type {
  MarketAssetDetails,
  MarketAssetHistoryPoint,
  MarketAssetNetwork,
  MarketAssetSessionLimit,
} from "@/lib/api/schemas/rwas";

import styles from "./asset-detail.module.css";

const CHART_HEIGHT = 300;
const DAILY_ATTESTATION_URL =
  "https://www.dropbox.com/scl/fo/jzkrw308mrhsasauqrjqq/AJxJak0F90kcwkADSN3DCD4?rlkey=nik1v5slekrzx5fbi0zan5sk3&st=t5vbvab8&dl=0";
const MONTHLY_ATTESTATION_URL =
  "https://www.dropbox.com/scl/fo/7rlmba8f49nvbp3xwz1of/ABv0vSjd6cIDAUTIlwm2KwA?rlkey=hokf0tffqvezfmsto25cvpovs&st=7ohgw8sv&dl=0";
const priceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const PRESET_USD_AMOUNTS = [10, 50, 100] as const;
const SELL_BALANCE_PERCENTAGES = [25, 50, 100] as const;
const QUOTE_DEBOUNCE_MS = 250;

type ChartPoint = { time: number; value: number };
type ChartHover = ChartPoint & { left: number; top: number };
type Trend = "positive" | "negative" | "neutral";
type OrderSide = "buy" | "sell";

interface AssetTradeAvailability {
  tradeable: boolean;
  title: string;
  context: string | null;
}

export function AssetDetail({
  symbol,
  renderTradePanel,
}: {
  symbol: string;
  renderTradePanel?: (detail: MarketAssetDetails) => ReactNode;
}) {
  const [range, setRange] = useState<MarketAssetChartRange>("1D");
  const detailQuery = useQuery({
    queryKey: ["rwas-market-asset", symbol],
    queryFn: ({ signal }) => fetchMarketAsset(symbol, { signal }),
    staleTime: 60_000,
    refetchInterval: (query) => (query.state.data?.detailsAvailable ? 60_000 : 2_000),
    retry: 2,
  });
  const historyQuery = useQuery({
    queryKey: ["rwas-market-asset-history", symbol, detailQuery.data?.asset.coingeckoId, range],
    queryFn: async ({ signal }) => {
      const coingeckoId = detailQuery.data?.asset.coingeckoId;
      if (!coingeckoId) {
        return fetchMarketAssetHistory(symbol, range, { signal });
      }
      try {
        return await fetchCoinGeckoMarketAssetHistory(coingeckoId, symbol, range, { signal });
      } catch (error) {
        if (signal.aborted) throw error;
        return fetchMarketAssetHistory(symbol, range, { signal });
      }
    },
    enabled: Boolean(detailQuery.data),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: (query) => (query.state.data?.available ? 30_000 : 2_000),
    retry: 2,
  });

  return (
    <section className={styles.detailPage}>
      <div className={styles.chartColumn}>
        {detailQuery.isPending ? (
          <ChartSkeleton />
        ) : detailQuery.isError || !detailQuery.data ? (
          <ChartError onRetry={() => void detailQuery.refetch()} />
        ) : (
          <>
            <AssetIdentity detail={detailQuery.data} />
            <AssetChart
              detail={detailQuery.data}
              history={historyQuery.data}
              historyPending={historyQuery.isPending || historyQuery.isPlaceholderData}
              historyError={historyQuery.isError}
              range={range}
              onRangeChange={setRange}
              onRetry={() => void historyQuery.refetch()}
            />
            <AssetInformation detail={detailQuery.data} />
          </>
        )}
      </div>
      {detailQuery.data ? (
        <TradeRail detail={detailQuery.data} renderTradePanel={renderTradePanel} />
      ) : null}
    </section>
  );
}

function AssetIdentity({ detail }: { detail: MarketAssetDetails }) {
  const availability = assetTradeAvailability(detail);
  const assetName = detail.underlyingName ?? detail.asset.name;

  return (
    <header className={styles.assetIdentity}>
      <div className={styles.assetIdentityMain}>
        <span className={styles.assetIdentityLogo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={detail.asset.iconUrl} alt={`${detail.asset.symbol}-icon`} />
        </span>
        <h1>
          <span>{assetName}</span>
          <span>{detail.asset.symbol}</span>
        </h1>
      </div>
      <div className={styles.assetTradingStatus} data-tradeable={availability.tradeable}>
        <span aria-hidden="true" />
        <p>
          {availability.title}
          {availability.context ? <em> ({availability.context})</em> : null}
        </p>
      </div>
    </header>
  );
}

function TradeRail({
  detail,
  renderTradePanel,
}: {
  detail: MarketAssetDetails;
  renderTradePanel?: (detail: MarketAssetDetails) => ReactNode;
}) {
  return (
    <aside className={styles.tradeRail} aria-label={`${detail.asset.symbol} trading options`}>
      <div className={styles.tradeCard}>
        {renderTradePanel ? renderTradePanel(detail) : <PurchasePanel detail={detail} />}
      </div>
    </aside>
  );
}

export function PurchasePanel({ detail }: { detail: MarketAssetDetails }) {
  const [side, setSide] = useState<OrderSide>("buy");
  const [amount, setAmount] = useState("");
  const [amountEdited, setAmountEdited] = useState(false);
  const [unavailableRequested, setUnavailableRequested] = useState(false);
  const [dismissedBlock, setDismissedBlock] = useState<string | null>(null);
  const symbol = detail.asset.symbol;
  const trade = useRwasTrade(detail);
  const showingPendingAmount = side === "buy" && trade.hasPendingBuy && !amountEdited;
  const pendingDraftBlocked = side === "buy" && trade.hasPendingBuy && amountEdited;
  const displayedAmount = showingPendingAmount ? (trade.pendingBuyAmount ?? "") : amount;
  const debouncedAmount = useDebouncedValue(displayedAmount, QUOTE_DEBOUNCE_MS);
  const paymentMethod = "USDC";
  const spendingAsset = side === "buy" ? paymentMethod : symbol;
  const receivingAsset = side === "buy" ? symbol : paymentMethod;
  const currentPrice = detail.primaryMarket?.priceUsd ?? detail.asset.primaryMarket.priceUsd;
  const ethereumDeployment = detail.networks.find(
    (network) => network.chainId === ETHEREUM_CHAIN_ID
  );
  const availability = assetTradeAvailability(detail);
  const activeBalance = side === "buy" ? trade.baseUsdcBalance : trade.assetBalance;
  const activeBalanceDecimals =
    side === "buy" ? USDC_DECIMALS : (ethereumDeployment?.decimals ?? 18);
  const activeBalanceAmount =
    activeBalance === null ? null : numberValue(formatUnits(activeBalance, activeBalanceDecimals));
  const hasAmount = numberValue(displayedAmount) > 0;
  const hasQuoteAmount = numberValue(debouncedAmount) > 0;
  const amountSettled = displayedAmount === debouncedAmount;
  const canRequestFusionQuote = Boolean(
    trade.authenticated && trade.walletAddress && ethereumDeployment
  );
  const fusionQuoteQuery = useQuery({
    queryKey: ["rwas-oneinch-quote", symbol, side, debouncedAmount, trade.walletAddress],
    queryFn: ({ signal }) =>
      fetchRwasOneInchQuote(
        {
          symbol,
          side,
          amount: debouncedAmount,
          walletAddress: trade.walletAddress!,
        },
        signal
      ),
    enabled: hasQuoteAmount && canRequestFusionQuote,
    staleTime: 5_000,
    retry: 1,
  });
  const indicativeQuoteQuery = useQuery({
    queryKey: ["rwas-market-asset-quote", symbol, side, debouncedAmount],
    queryFn: ({ signal }) =>
      fetchMarketAssetQuote(symbol, { side, amount: debouncedAmount }, { signal }),
    enabled: hasQuoteAmount && !canRequestFusionQuote,
    staleTime: 5_000,
    retry: 1,
  });
  const firmOutput =
    trade.firmQuote?.side === side
      ? formatTradeAmount(
          numberValue(
            formatUnits(BigInt(trade.firmQuote.output.amount), trade.firmQuote.output.decimals)
          ),
          receivingAsset
        )
      : null;
  const fallbackOutput = indicativeTradeOutput({
    side,
    amount: debouncedAmount,
    unitPrice: currentPrice,
    outputAsset: receivingAsset,
  });
  const fusionOutput = fusionQuoteQuery.data
    ? formatTradeAmount(
        numberValue(
          formatUnits(
            BigInt(fusionQuoteQuery.data.output.amount),
            fusionQuoteQuery.data.output.decimals
          )
        ),
        receivingAsset
      )
    : null;
  const quote =
    firmOutput ??
    fusionOutput ??
    (indicativeQuoteQuery.data
      ? formatTradeAmount(
          numberValue(indicativeQuoteQuery.data.outputAmount),
          indicativeQuoteQuery.data.outputAsset
        )
      : fallbackOutput);
  const activeQuotePending = canRequestFusionQuote
    ? fusionQuoteQuery.isPending || fusionQuoteQuery.isFetching
    : indicativeQuoteQuery.isPending || indicativeQuoteQuery.isFetching;
  const activeQuoteError = canRequestFusionQuote
    ? fusionQuoteQuery.isError
    : indicativeQuoteQuery.isError;
  const unsafeFusionQuote = fusionQuoteQuery.data?.economicallyViable === false;
  const unsafeFusionRate = fusionQuoteQuery.data?.minimumEffectiveRatePercent ?? 0;
  const actionLabel = showingPendingAmount
    ? trade.pendingBuyNeedsEthereumClaim
      ? "Claim Ethereum USDC"
      : trade.pendingBuyClaimingEthereumUsdc
        ? "Claiming Ethereum USDC"
        : trade.pendingBuyHasEthereumUsdc
          ? "Retry asset purchase"
          : "Continue purchase"
    : pendingDraftBlocked
      ? "Purchase pending"
      : `${side === "buy" ? "Buy" : "Sell"} ${symbol}`;
  const blockKey = trade.blockedTrade
    ? `${trade.blockedTrade.code}:${trade.blockedTrade.message}`
    : null;
  const unavailableOpen =
    unavailableRequested || (blockKey !== null && blockKey !== dismissedBlock);
  const overBalance =
    !showingPendingAmount &&
    activeBalanceAmount !== null &&
    Number.isFinite(activeBalanceAmount) &&
    hasAmount &&
    numberValue(displayedAmount) > activeBalanceAmount;
  const noSellBalance = side === "sell" && trade.assetBalance === 0n;
  const waitingForBalance = trade.authenticated && trade.balancesLoading;
  const balanceLabel = trade.balancesLoading
    ? "Balance loading..."
    : activeBalance === null
      ? "Balance —"
      : side === "buy"
        ? `Balance $${formatBalance(activeBalance, activeBalanceDecimals)}`
        : `Balance ${formatBalance(activeBalance, activeBalanceDecimals)} ${symbol}`;

  function changeSide(nextSide: OrderSide) {
    if (trade.busy) return;
    setSide(nextSide);
    setAmount("");
    setAmountEdited(false);
  }

  function applyPreset(value: number) {
    if (side === "buy") {
      setAmount(String(value));
      setAmountEdited(true);
      return;
    }
    if (trade.assetBalance === null || trade.assetBalance <= 0n) return;
    const rawAmount = (trade.assetBalance * BigInt(value)) / 100n;
    setAmount(formatUnits(rawAmount, activeBalanceDecimals));
    setAmountEdited(true);
  }

  function fillAvailableBalance() {
    if (activeBalance === null || activeBalance <= 0n) return;
    setAmount(formatUnits(activeBalance, activeBalanceDecimals));
    setAmountEdited(true);
  }

  function requestTrade() {
    if (!availability.tradeable) {
      setUnavailableRequested(true);
      return;
    }
    if ((hasQuoteAmount && amountSettled && !pendingDraftBlocked) || showingPendingAmount) {
      setDismissedBlock(null);
      void trade.execute(side, displayedAmount);
    }
  }

  function clearPendingPurchase() {
    trade.clearPendingBuy();
    setAmount("");
    setAmountEdited(false);
  }

  function closeUnavailableDialog() {
    setUnavailableRequested(false);
    if (blockKey) setDismissedBlock(blockKey);
  }

  return (
    <section className={styles.purchasePanel}>
      <h2>
        {side === "buy" ? "Buy" : "Sell"} {symbol}
      </h2>

      <div className={styles.purchaseToolbar}>
        <div className={styles.sideTabs} aria-label="Order side">
          <button type="button" aria-pressed={side === "buy"} onClick={() => changeSide("buy")}>
            Buy
          </button>
          <button type="button" aria-pressed={side === "sell"} onClick={() => changeSide("sell")}>
            Sell
          </button>
        </div>
      </div>

      <TradeAmountField
        label="Amount"
        asset={spendingAsset}
        assetIconUrl={spendingAsset === symbol ? detail.asset.iconUrl : undefined}
        value={displayedAmount}
        onChange={(value) => {
          setAmount(value);
          setAmountEdited(true);
        }}
        disabled={trade.busy}
        balanceLabel={balanceLabel}
        onBalanceClick={
          activeBalance !== null && activeBalance > 0n ? fillAvailableBalance : undefined
        }
      />
      <div className={styles.amountPresets} aria-label="Quick amount presets">
        {(side === "buy" ? PRESET_USD_AMOUNTS : SELL_BALANCE_PERCENTAGES).map((preset) => (
          <button
            key={preset}
            type="button"
            aria-label={
              side === "buy"
                ? `Set trade amount to $${preset}`
                : `Sell ${preset}% of available ${symbol}`
            }
            disabled={trade.busy || (side === "sell" && noSellBalance)}
            onClick={() => applyPreset(preset)}
          >
            {side === "buy" ? `$${preset}` : preset === 100 ? "Max" : `${preset}%`}
          </button>
        ))}
      </div>
      <p className={styles.amountHint} data-error={overBalance || undefined}>
        {showingPendingAmount
          ? `${trade.pendingBuyAmount ?? "Your"} Base USDC has already been sent. No ${symbol} has been bought until Ethereum settlement completes.`
          : pendingDraftBlocked
            ? `The existing ${trade.pendingBuyAmount ?? ""} Base USDC purchase is still processing. You can submit this new amount after it completes.`
            : overBalance
              ? `Insufficient ${spendingAsset} balance.`
              : side === "buy"
                ? "Available Base USDC funds this purchase. Gas is sponsored."
                : `Choose how much ${symbol} to sell. Proceeds settle as Ethereum USDC.`}
      </p>

      {unsafeFusionQuote ? (
        <p className={styles.tradeError} role="alert">
          The current 1inch route guarantees only {unsafeFusionRate.toFixed(2)}% of market value.
          Enter a larger amount.
        </p>
      ) : null}

      {hasAmount ? (
        <div className={styles.quoteDetails}>
          <QuoteRow
            label="You get about"
            value={
              firmOutput
                ? firmOutput
                : !amountSettled
                  ? "Getting quote..."
                  : activeQuoteError && !quote
                    ? "Quote unavailable"
                    : (quote ?? "Getting quote...")
            }
            tooltip={
              firmOutput
                ? "The expected output from the submitted 1inch Fusion order."
                : fusionOutput
                  ? "Live 1inch Fusion expected output. A fresh order is prepared before signing."
                  : "Short-lived indicative quote. A live 1inch Fusion quote is requested before trading."
            }
          />
        </div>
      ) : null}

      <button
        type="button"
        className={styles.tradeActionButton}
        aria-label={actionLabel}
        aria-busy={trade.busy}
        disabled={
          pendingDraftBlocked ||
          ((!hasAmount ||
            !amountSettled ||
            (availability.tradeable && canRequestFusionQuote && activeQuotePending)) &&
            !showingPendingAmount) ||
          unsafeFusionQuote ||
          overBalance ||
          noSellBalance ||
          waitingForBalance ||
          trade.pendingBuyClaimingEthereumUsdc ||
          trade.busy
        }
        onClick={requestTrade}
      >
        {actionLabel}
      </button>

      {trade.statusMessage ? (
        <p className={styles.tradeStatus} role="status">
          {trade.statusMessage}
        </p>
      ) : null}
      {side === "buy" && trade.hasPendingBuy ? (
        <button type="button" className={styles.clearPendingButton} onClick={clearPendingPurchase}>
          Clear pending purchase
        </button>
      ) : null}
      {trade.error ? (
        <p className={styles.tradeError} role="alert">
          {trade.error}
        </p>
      ) : null}

      <p className={styles.tradeLegalNotice}>
        Tokenized assets may be subject to securities, eligibility, and jurisdictional restrictions.
        Review the applicable legal information before trading.
        {detail.legalNoticeUrl ? (
          <>
            {" "}
            <a href={detail.legalNoticeUrl} target="_blank" rel="noreferrer">
              Additional information.*
            </a>
          </>
        ) : null}
      </p>

      <TradeUnavailableDialog
        open={unavailableOpen}
        symbol={symbol}
        availability={availability}
        providerMessage={trade.blockedTrade?.message ?? null}
        nextMarketOpen={detail.tradingStatus?.nextMarketOpen ?? null}
        onClose={closeUnavailableDialog}
      />
    </section>
  );
}

function TradeUnavailableDialog({
  open,
  symbol,
  availability,
  providerMessage,
  nextMarketOpen,
  onClose,
}: {
  open: boolean;
  symbol: string;
  availability: AssetTradeAvailability;
  providerMessage: string | null;
  nextMarketOpen: string | null;
  onClose: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;
  const context = availability.context ?? providerMessage ?? "Trading is temporarily unavailable";
  const resumesAt = formatMarketOpen(nextMarketOpen);

  return (
    <div className={styles.tradeUnavailableLayer}>
      <button
        type="button"
        className={styles.tradeUnavailableBackdrop}
        aria-label="Close asset paused dialog"
        onClick={onClose}
      />
      <section
        className={styles.tradeUnavailableDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-paused-title"
        aria-describedby="asset-paused-description"
      >
        <span className={styles.tradeUnavailableIcon} aria-hidden="true">
          <span />
        </span>
        <h2 id="asset-paused-title">Asset Paused</h2>
        <p id="asset-paused-description">
          {symbol} is currently unavailable for trading. You can still review the indicative quote,
          but an order cannot be submitted right now.
        </p>
        <div className={styles.tradeUnavailableReason}>
          <span>Status</span>
          <strong>{context}</strong>
        </div>
        {resumesAt ? (
          <p className={styles.tradeUnavailableResume}>Trading resumes {resumesAt}.</p>
        ) : null}
        <button
          ref={closeButton}
          type="button"
          className={styles.tradeUnavailableClose}
          onClick={onClose}
        >
          Got it
        </button>
      </section>
    </div>
  );
}

function TradeAmountField({
  label,
  asset,
  assetIconUrl,
  value,
  onChange,
  disabled,
  balanceLabel,
  onBalanceClick,
}: {
  label: string;
  asset: string;
  assetIconUrl?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  balanceLabel: string;
  onBalanceClick?: () => void;
}) {
  return (
    <div className={styles.amountField}>
      <span className={styles.amountHeader}>
        <span className={styles.amountLabel}>{label}</span>
        <button
          type="button"
          className={styles.amountBalance}
          disabled={!onBalanceClick || disabled}
          onClick={(event) => {
            event.preventDefault();
            onBalanceClick?.();
          }}
        >
          {balanceLabel}
        </button>
      </span>
      <span className={styles.amountControl}>
        <input
          aria-label={`${label} in ${asset}`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(normalizeAmount(event.target.value))}
        />
        <span className={styles.amountAsset}>
          {assetIconUrl ? (
            <AssetLogo src={assetIconUrl} symbol={asset} />
          ) : (
            <PaymentMethodIcon method={asset} />
          )}
          <strong>{asset}</strong>
        </span>
      </span>
    </div>
  );
}

function QuoteRow({ label, tooltip, value }: { label: string; tooltip: string; value: string }) {
  return (
    <div className={styles.quoteRow}>
      <span>
        {label}
        <span className={styles.quoteHelp} title={tooltip} aria-label={tooltip}>
          ?
        </span>
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function AssetLogo({ src, symbol }: { src: string; symbol: string }) {
  return (
    <span className={styles.tradeAssetLogo}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={symbol} />
    </span>
  );
}

function AssetInformation({ detail }: { detail: MarketAssetDetails }) {
  return (
    <div className={styles.informationStack}>
      <AboutSection detail={detail} />
      <StatisticsSection detail={detail} />
      {detail.sessionLimits ? <SessionLimitsSection detail={detail} /> : null}
      <TokenholderProtectionsSection />
      <MintAndRedemptionSection detail={detail} />
      {detail.topHoldings.length > 0 ? <TopHoldingsSection detail={detail} /> : null}
      {detail.documents.length > 0 ? <LegalDocumentsSection detail={detail} /> : null}
    </div>
  );
}

function AboutSection({ detail }: { detail: MarketAssetDetails }) {
  const [expanded, setExpanded] = useState(false);
  const [networkIndex, setNetworkIndex] = useState(0);
  const description = detail.description?.trim() ?? "";
  const truncated = description.length > 220;
  const shownDescription =
    !expanded && truncated ? `${description.slice(0, 217).trimEnd()}...` : description;
  const selectedNetwork = detail.networks[networkIndex] ?? detail.networks[0];
  const categories = assetCategories(detail);
  const underlyingName = detail.underlyingName ?? detail.asset.underlyingMarket?.name;
  const ticker = detail.asset.ticker ?? detail.asset.underlyingMarket?.ticker;
  const sharesMultiplier = detail.primaryMarket?.sharesMultiplier;

  return (
    <section className={styles.informationSection} aria-labelledby="asset-about-title">
      <h2 id="asset-about-title" className={styles.sectionTitle}>
        About<sup>1</sup>
      </h2>

      {description ? (
        <p className={styles.description}>
          {shownDescription}
          {truncated ? (
            <button type="button" onClick={() => setExpanded((value) => !value)}>
              {expanded ? "Show Less" : "Show More"}
            </button>
          ) : null}
        </p>
      ) : null}

      <div className={styles.detailColumns}>
        <div className={styles.detailColumn}>
          {detail.networks.length > 0 ? (
            <DetailRow label="Supported Chains" first>
              <div className={styles.networkList} aria-label="Supported networks">
                {detail.networks.map((network) => (
                  <NetworkIcon key={`${network.chainId}-${network.address}`} network={network} />
                ))}
              </div>
            </DetailRow>
          ) : null}

          {selectedNetwork ? (
            <DetailRow label="Onchain Address">
              <div className={styles.addressValue}>
                <NetworkIcon network={selectedNetwork} />
                <span title={selectedNetwork.address}>{shortAddress(selectedNetwork.address)}</span>
                <button
                  type="button"
                  className={styles.copyButton}
                  aria-label={`Copy ${selectedNetwork.network} address`}
                  onClick={() => void copyText(selectedNetwork.address)}
                >
                  <CopyIcon />
                </button>
                {detail.networks.length > 1 ? (
                  <span className={styles.networkSelectControl}>
                    <ChevronDownIcon />
                    <select
                      aria-label="Select onchain network"
                      value={networkIndex}
                      onChange={(event) => setNetworkIndex(Number(event.target.value))}
                    >
                      {detail.networks.map((network, index) => (
                        <option key={`${network.chainId}-${network.address}`} value={index}>
                          {networkLabel(network)}
                        </option>
                      ))}
                    </select>
                  </span>
                ) : null}
              </div>
            </DetailRow>
          ) : null}

          {categories.length > 0 ? (
            <DetailRow label="Category">
              <div className={styles.categoryList}>
                {categories.map((category) => (
                  <span key={category} className={styles.categoryChip}>
                    {category}
                  </span>
                ))}
              </div>
            </DetailRow>
          ) : null}
        </div>

        <div className={styles.detailColumn}>
          {underlyingName ? (
            <DetailRow label="Underlying Asset Name" first>
              <span className={styles.ellipsisValue} title={underlyingName}>
                {underlyingName}
              </span>
            </DetailRow>
          ) : null}
          {ticker ? <DetailRow label="Underlying Asset Ticker">{ticker}</DetailRow> : null}
          {sharesMultiplier && ticker ? (
            <DetailRow
              label="Shares Per Token"
              tooltip="The number of underlying shares represented by one token."
            >
              1 {detail.asset.symbol} = {formatShares(sharesMultiplier)} {ticker}
            </DetailRow>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StatisticsSection({ detail }: { detail: MarketAssetDetails }) {
  const primary = detail.primaryMarket;
  const underlying = detail.underlyingMarket;
  const dividend = detail.dividend;
  const showDividend =
    dividend?.payoutFrequency && dividend.payoutFrequency.toLowerCase() !== "none";

  if (!primary && !underlying && !showDividend) return null;

  return (
    <section className={styles.informationSection} aria-labelledby="asset-statistics-title">
      <h2 id="asset-statistics-title" className={styles.sectionTitle}>
        Statistics
      </h2>
      <div className={styles.statisticsGrid}>
        {primary ? (
          <StatisticBlock title={<PriceStatisticTitle label="Token Price" />}>
            <StatisticRow label="Open" value={formatUsd(primary.openUsd)} />
            <StatisticRow label="High" value={formatUsd(primary.highUsd)} />
            <StatisticRow label="Low" value={formatUsd(primary.lowUsd)} />
          </StatisticBlock>
        ) : null}

        {underlying ? (
          <StatisticBlock title={<PriceStatisticTitle label="Underlying Asset Price" />}>
            <StatisticRow label="Open" value={formatUsd(underlying.openUsd)} />
            <StatisticRow label="High" value={formatUsd(underlying.highUsd)} />
            <StatisticRow label="Low" value={formatUsd(underlying.lowUsd)} />
          </StatisticBlock>
        ) : null}

        {underlying ? (
          <StatisticBlock
            title={
              <>
                Underlying Asset Statistics<sup>3</sup>
              </>
            }
          >
            <StatisticRow
              label="Total Market Cap"
              tooltip="The total market capitalization of the asset on the traditional exchanges from which liquidity is sourced."
              value={formatCompactUsd(underlying.marketCapUsd)}
            />
            <StatisticRow
              label="24h Volume"
              tooltip="The 24h volume of the asset on the traditional exchanges from which liquidity is sourced."
              value={formatInteger(underlying.volume24hUsd)}
            />
            <StatisticRow
              label="Average Volume"
              tooltip="The average daily volume for the past year on the traditional exchanges from which liquidity is sourced."
              value={formatInteger(underlying.averageVolume)}
            />
          </StatisticBlock>
        ) : null}

        {showDividend && dividend ? (
          <StatisticBlock title="Dividend">
            <StatisticRow label="Yield" value={formatPercent(dividend.dividendYieldPercent)} />
            <StatisticRow label="Last Cash Amount" value={formatUsd(dividend.lastCashAmountUsd)} />
            <StatisticRow label="Payout Frequency" value={dividend.payoutFrequency ?? "-"} />
          </StatisticBlock>
        ) : null}
      </div>
    </section>
  );
}

function PriceStatisticTitle({ label }: { label: string }) {
  return (
    <>
      {label}
      <sup>2</sup> <span className={styles.statisticDuration}>24H</span>
      <sup>4</sup>
    </>
  );
}

function StatisticBlock({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.statisticBlock}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function StatisticRow({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: string;
  tooltip?: string;
}) {
  return (
    <div className={styles.statisticRow}>
      <span className={styles.rowLabel}>
        {label}
        {tooltip ? <TooltipMark label={tooltip} /> : null}
      </span>
      <span>{value}</span>
    </div>
  );
}

const SESSION_ROWS = [
  {
    key: "premarket",
    label: "Pre-Market",
    fullHours: "4:00:00 AM - 9:29:59 AM",
    compactHours: "4:00 AM - 9:29 AM",
  },
  {
    key: "regular",
    label: "Regular",
    fullHours: "9:30:00 AM - 3:59:59 PM",
    compactHours: "9:30 AM - 3:59 PM",
  },
  {
    key: "postmarket",
    label: "Post-Market",
    fullHours: "4:00:00 PM - 7:59:59 PM",
    compactHours: "4:00 PM - 7:59 PM",
  },
  {
    key: "overnight",
    label: "Overnight",
    fullHours: "8:00:00 PM - 3:59:59 AM",
    compactHours: "8:00 PM - 3:59 AM",
  },
  {
    key: "offhours",
    label: "Off-Hours",
    fullHours: "Continuous",
    compactHours: "Continuous",
  },
] as const;

function SessionLimitsSection({ detail }: { detail: MarketAssetDetails }) {
  const limits = detail.sessionLimits;
  if (!limits) return null;

  return (
    <section className={styles.informationSection} aria-labelledby="asset-session-limits-title">
      <h2 id="asset-session-limits-title" className={styles.sectionTitle}>
        Session Limits
      </h2>
      <p className={styles.sessionDescription}>
        The following table highlights the maximum single trade size for each asset for the given
        trading session. For example if the maximum trade size for {detail.asset.symbol} is $1M in
        the regular session, you may submit 3 subsequent trades of $1M to acquire $3M worth of{" "}
        {detail.asset.symbol}. The off-hours limit reflects a maximum net position (buys and sells
        offset) while the U.S. market is closed.
      </p>

      <div className={styles.sessionTable} role="table" aria-label="Asset session limits">
        <div className={`${styles.sessionRow} ${styles.sessionHeader}`} role="row">
          <span role="columnheader" />
          <span role="columnheader">Session</span>
          <span role="columnheader">
            Hours <em>(ET)</em>
          </span>
          <span role="columnheader">
            Limit <em>($)</em>
          </span>
        </div>
        {SESSION_ROWS.map((row, index) => {
          const limit = limits[row.key];
          if (!limit) return null;
          return (
            <div className={styles.sessionRow} role="row" key={row.key}>
              <span className={styles.marketHours} role="cell">
                {index === 0 ? (
                  <>
                    <strong>Market Hours</strong>
                    <small>(Sun 8:00 PM ET - Fri 8:00 PM ET)</small>
                  </>
                ) : null}
                {row.key === "offhours" ? (
                  <>
                    <strong>Off Market Hours</strong>
                    <small>(Fri 8:00 PM ET - Sun 8:00 PM ET, Holidays)</small>
                  </>
                ) : null}
              </span>
              <span className={styles.sessionName} role="cell">
                <SessionIcon session={row.key} />
                {row.label}
              </span>
              <span role="cell">
                <span className={styles.fullSessionValue}>{row.fullHours}</span>
                <span className={styles.compactSessionValue}>{row.compactHours}</span>
              </span>
              <span className={styles.sessionLimit} role="cell">
                <span className={styles.fullSessionValue}>{formatLimit(limit)}</span>
                <span className={styles.compactSessionValue}>{formatCompactLimit(limit)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TokenholderProtectionsSection() {
  return (
    <section className={styles.informationSection} aria-labelledby="asset-protections-title">
      <h2 id="asset-protections-title" className={styles.sectionTitle}>
        Tokenholder Protections
      </h2>
      <div className={styles.detailColumns}>
        <div className={styles.detailColumn}>
          <DetailRow
            label="Security Interest in Collateral"
            tooltip="Tokenholders benefit from a first-priority security interest in the collateral."
            first
          >
            Yes
          </DetailRow>
          <DetailRow
            label="Bankruptcy Remote"
            tooltip="The issuing structure is designed to separate collateral from operating-company bankruptcy risk."
          >
            Yes
          </DetailRow>
        </div>
        <div className={styles.detailColumn}>
          <DetailRow label="Daily Attestation Reports" first>
            <ReportLink href={DAILY_ATTESTATION_URL} />
          </DetailRow>
          <DetailRow label="Monthly Attestation Reports">
            <ReportLink href={MONTHLY_ATTESTATION_URL} />
          </DetailRow>
        </div>
      </div>
    </section>
  );
}

function MintAndRedemptionSection({ detail }: { detail: MarketAssetDetails }) {
  const paymentMethods =
    detail.supportedPaymentMethods.length > 0 ? detail.supportedPaymentMethods : ["USDC", "USDT"];

  return (
    <section className={styles.informationSection} aria-labelledby="asset-mint-title">
      <h2 id="asset-mint-title" className={styles.sectionTitle}>
        Mint and Redemption Capabilities
      </h2>
      <div className={styles.detailColumns}>
        <div className={styles.detailColumn}>
          <DetailRow label="Minimum Amount" first>
            {formatMinimumAmount(detail.minimumAmountUsd ?? "1")}
          </DetailRow>
        </div>
        <div className={styles.detailColumn}>
          <DetailRow
            label="Supported Purchase Methods"
            tooltip="Assets accepted to purchase or redeem this token."
            first
          >
            <span className={styles.paymentMethods} aria-label={paymentMethods.join(", ")}>
              {paymentMethods.map((method) => (
                <PaymentMethodIcon key={method} method={method} />
              ))}
            </span>
          </DetailRow>
        </div>
      </div>
    </section>
  );
}

function TopHoldingsSection({ detail }: { detail: MarketAssetDetails }) {
  const holdings = detail.topHoldings.slice(0, 10);
  const updatedAt = holdings.reduce<string | null>((latest, holding) => {
    if (!latest || Date.parse(holding.updatedAt) > Date.parse(latest)) return holding.updatedAt;
    return latest;
  }, null);

  return (
    <section className={styles.informationSection} aria-labelledby="asset-holdings-title">
      <h2 id="asset-holdings-title" className={styles.sectionTitle}>
        Top 10 Holdings
      </h2>
      <div className={styles.holdingsTable} role="table" aria-label="Top ten holdings">
        <div className={`${styles.holdingsRow} ${styles.holdingsHeader}`} role="row">
          <span role="columnheader">#</span>
          <span role="columnheader">Name</span>
          <span role="columnheader">Ticker</span>
          <span role="columnheader">Allocation</span>
        </div>
        {holdings.map((holding, index) => (
          <div className={styles.holdingsRow} role="row" key={`${holding.symbol}-${holding.name}`}>
            <span role="cell">#{index + 1}</span>
            <span role="cell">{holding.name}</span>
            <span role="cell">{holding.symbol}</span>
            <span role="cell">{formatPercent(holding.weightPercent)}</span>
          </div>
        ))}
      </div>
      {updatedAt ? <p className={styles.asOf}>As of {formatLongDate(updatedAt)}</p> : null}
    </section>
  );
}

function LegalDocumentsSection({ detail }: { detail: MarketAssetDetails }) {
  return (
    <section className={styles.informationSection} aria-labelledby="asset-documents-title">
      <h2 id="asset-documents-title" className={styles.sectionTitle}>
        Legal Documents
      </h2>
      <div className={styles.documentList}>
        {detail.documents.map((document) => (
          <a
            href={document.url}
            target="_blank"
            rel="noreferrer"
            className={styles.documentLink}
            key={`${document.name}-${document.url}`}
          >
            <DownloadIcon />
            <span>{document.name}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function DetailRow({
  label,
  tooltip,
  first = false,
  children,
}: {
  label: string;
  tooltip?: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`${styles.detailRow} ${first ? styles.firstDetailRow : ""}`}>
      <span className={styles.rowLabel}>
        {label}
        {tooltip ? <TooltipMark label={tooltip} /> : null}
      </span>
      <div className={styles.detailValue}>{children}</div>
    </div>
  );
}

function TooltipMark({ label }: { label: string }) {
  return (
    <span className={styles.tooltipMark} title={label} aria-label={label}>
      ?
    </span>
  );
}

function ReportLink({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={styles.reportLink}>
      View Reports
      <ArrowUpRightIcon />
    </a>
  );
}

function NetworkIcon({ network }: { network: MarketAssetNetwork }) {
  const name = network.network.toLowerCase();
  if (name.includes("bnb") || name.includes("bsc")) {
    return (
      <svg className={styles.networkIcon} viewBox="0 0 20 20" aria-label="BNB Chain">
        <circle cx="10" cy="10" r="10" fill="#F0B90B" />
        <path
          d="m10 3.2 2.05 1.2L10 5.6 7.95 4.4 10 3.2Zm-3.46 2.03 2.04 1.2-2.04 1.2-2.05-1.2 2.05-1.2Zm6.92 0 2.05 1.2-2.05 1.2-2.04-1.2 2.04-1.2ZM10 7.22l2.05 1.2v2.4L10 12.03l-2.05-1.2v-2.4L10 7.21Zm-5.51.82 2.05 1.2v2.39l2.04 1.2v2.4l-4.09-2.4v-4.8Zm11.02 0v4.79l-4.09 2.4v-2.4l2.04-1.2v-2.4l2.05-1.2ZM10 14.43l2.05 1.2L10 16.8l-2.05-1.18L10 14.43Z"
          fill="#fff"
        />
      </svg>
    );
  }
  if (name.includes("sol")) {
    return (
      <svg className={styles.networkIcon} viewBox="0 0 24 24" aria-label="Solana">
        <circle cx="12" cy="12" r="10" fill="#050505" />
        <path d="M7.2 7.3h9.65l-1.55 1.65H5.65L7.2 7.3Z" fill="#19FB9B" />
        <path d="M7.2 11.18h9.65l-1.55 1.64H5.65l1.55-1.64Z" fill="#43B4CA" />
        <path d="M7.2 15.05h9.65L15.3 16.7H5.65l1.55-1.65Z" fill="#9945FF" />
      </svg>
    );
  }
  return (
    <svg className={styles.networkIcon} viewBox="0 0 24 24" aria-label="Ethereum">
      <circle cx="12" cy="12" r="10" fill="#677FE3" />
      <path d="m12.05 3.92-.108.367V14.974l.108.108 4.947-2.932-4.947-8.23Z" fill="#C1CBF2" />
      <path d="m12.05 3.92-4.947 8.23 4.947 2.932V3.92Z" fill="#fff" />
      <path d="m12.05 16.022-.061.074v3.807l.061.178L17 13.091l-4.95 2.93Z" fill="#C1CBF2" />
      <path d="M12.05 20.081v-4.06l-4.947-2.93 4.947 6.99Z" fill="#fff" />
      <path d="m12.05 15.083 4.947-2.933-4.947-2.254v5.187Z" fill="#8497E8" />
      <path d="m7.103 12.15 4.947 2.933V9.896L7.103 12.15Z" fill="#C1CBF2" />
    </svg>
  );
}

function SessionIcon({ session }: { session: (typeof SESSION_ROWS)[number]["key"] }) {
  if (session === "regular") {
    return (
      <svg className={styles.sessionIcon} viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" />
        <path
          d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.4 1.4M11.55 11.55l1.4 1.4M12.95 3.05l-1.4 1.4M4.45 11.55l-1.4 1.4"
          stroke="currentColor"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (session === "overnight") {
    return (
      <svg className={styles.sessionIcon} viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M1.5 13.5h8M3 12V7.5M7.5 12V7.5M1.4 6.4 6 3.4l4.6 3H1.4Z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
        />
        <path
          d="M11.2 2.1a3.1 3.1 0 1 1-2.3 5.1 3.4 3.4 0 0 0 2.3-5.1Z"
          fill="none"
          stroke="currentColor"
        />
      </svg>
    );
  }
  if (session === "offhours") {
    return (
      <svg className={styles.sessionIcon} viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="7.4" cy="7.2" r="3" fill="none" stroke="currentColor" />
        <path
          d="M7.4 1v1.6M1.2 7.2h1.6M3 2.8l1.1 1.1M2 14 14 2"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  const postMarket = session === "postmarket";
  return (
    <svg className={styles.sessionIcon} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M14 12.3v1H2v-1h12Zm-9.75-2.35v1H2v-1h2.25Zm9.75 0v1h-2.25v-1H14ZM8 8.08a2.75 2.75 0 0 1 2.75 2.75h-1a1.75 1.75 0 1 0-3.5 0h-1A2.75 2.75 0 0 1 8 8.08ZM5.45 7.57l-.71.71-1.59-1.6.7-.7 1.6 1.59Zm7.5-.89-1.6 1.6-.7-.71 1.59-1.59.7.7Z"
        fill="currentColor"
      />
      {postMarket ? (
        <path
          d="M8.5 2.67v2.98l1.06-.85.63.78L8 7.33 5.81 5.58l.63-.78 1.06.85V2.67h1Z"
          fill="currentColor"
        />
      ) : (
        <path
          d="m10.19 4.44-.63.78-1.06-.85v2.71h-1V4.37l-1.06.85-.63-.78L8 2.69l2.19 1.75Z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

function PaymentMethodIcon({ method }: { method: string }) {
  const normalized = method.toUpperCase();
  if (normalized === "USDT") {
    return (
      <svg className={styles.paymentIcon} viewBox="0 0 20 20" aria-label="USDT">
        <circle cx="10" cy="10" r="10" fill="#50AF95" />
        <path
          d="M5.1 4.3h9.8v2.4h-3.7v1.4c2.2.1 3.8.5 3.8 1s-1.6.9-3.8 1v5.6H8.8v-5.6c-2.2-.1-3.8-.5-3.8-1s1.6-.9 3.8-1V6.7H5.1V4.3Zm5 5c2 0 3.5-.2 3.5-.5s-1.5-.5-3.5-.5-3.5.2-3.5.5 1.5.5 3.5.5Z"
          fill="#fff"
        />
      </svg>
    );
  }
  return (
    <svg className={styles.paymentIcon} viewBox="0 0 20 20" aria-label={normalized}>
      <circle cx="10" cy="10" r="10" fill="#2775CA" />
      <circle cx="10" cy="10" r="6.9" fill="none" stroke="#fff" strokeWidth="1.1" />
      <path
        d="M11.8 7.5c-.25-.65-.8-1-1.65-1-.9 0-1.5.42-1.5 1.05 0 .57.47.9 1.6 1.18 1.45.36 2.15.95 2.15 2.05 0 1.22-.85 2.06-2.15 2.23v1.12H9.3v-1.1c-1.33-.15-2.18-.87-2.48-2.08l1.25-.32c.23.82.85 1.25 1.82 1.25.9 0 1.52-.4 1.52-1.02 0-.58-.45-.9-1.62-1.2-1.43-.37-2.08-.97-2.08-2.04 0-1.15.8-1.96 2.03-2.12V4.4h.95v1.08c1.18.14 1.95.75 2.3 1.7l-1.2.32Z"
        fill="#fff"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15.87 3H3v12.87h1.43V4.43h11.44V3Z" fill="currentColor" />
      <path d="M21 7.42H7.42V21H21V7.42Zm-12.15 12.15V8.85h10.72v10.72H8.85Z" fill="currentColor" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4.8 7.94 7.2 7.2 7.2-7.2 1.06 1.06L12 17.26 3.74 9 4.8 7.94Z" fill="currentColor" />
    </svg>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M17.98 7.83 5.9 19.9l-1.06-1.06L16.9 6.78l-8.18-.01V5.28l10.76.01v10.75h-1.5V7.83Z"
        fill="currentColor"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="m17.87 8.9-5.12 5.11V1.89h-1.5V14L6.15 8.9l-1.06 1.06L12 16.88l6.93-6.92-1.06-1.06Z"
        fill="currentColor"
      />
      <path
        d="M4.95 16.2v3.45h14.1V16.2h1.5v4.2l-.75.75H4.2l-.75-.75v-4.2h1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function AssetChart({
  detail,
  history,
  historyPending,
  historyError,
  range,
  onRangeChange,
  onRetry,
}: {
  detail: MarketAssetDetails;
  history: MarketAssetChartHistory | undefined;
  historyPending: boolean;
  historyError: boolean;
  range: MarketAssetChartRange;
  onRangeChange: (range: MarketAssetChartRange) => void;
  onRetry: () => void;
}) {
  const points = chartData(history, detail, range);
  const movement = chartMovement(detail, points, range);
  const movementTrend = trendForValue(movement.usd);
  const paused = detail.asset.tradingPaused || detail.tradingStatus?.tradeable === false;
  const chartTrend = paused ? "neutral" : movementTrend;
  const price = detail.primaryMarket?.priceUsd ?? detail.asset.primaryMarket.priceUsd;

  return (
    <section className={`${styles.chartCard} ${styles[chartTrend]}`}>
      <div className={styles.chartHeader}>
        <div className={styles.priceBlock}>
          <h1>{formatUsd(price)}</h1>
          <div className={`${styles.change} ${styles[movementTrend]}`}>
            <TrendIcon trend={movementTrend} />
            <span>
              {formatAbsoluteUsd(movement.usd)} ({formatAbsolutePercent(movement.percent)}){" "}
              {durationLabel(range)}
            </span>
          </div>
        </div>

        <div className={styles.chartControls}>
          <select
            className={styles.rangeSelect}
            aria-label="Select price history range"
            value={range}
            onChange={(event) => onRangeChange(event.target.value as MarketAssetChartRange)}
          >
            {MARKET_ASSET_CHART_RANGES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <div className={styles.rangeTabs} aria-label="Price history range">
            {MARKET_ASSET_CHART_RANGES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={range === option}
                onClick={() => onRangeChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.chartShell}>
        {points.length > 1 ? (
          <AssetPriceChart points={points} trend={chartTrend} range={range} />
        ) : (
          <ChartEmpty pending={historyPending} error={historyError} onRetry={onRetry} />
        )}
      </div>
    </section>
  );
}

function AssetPriceChart({
  points,
  trend,
  range,
}: {
  points: ChartPoint[];
  trend: Trend;
  range: MarketAssetChartRange;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<ChartHover | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const data = orderedChartPoints(points);
    if (!container || data.length < 2) return;

    const colors = chartColors(trend);
    const chart: IChartApi = createChart(container, {
      crosshair: {
        horzLine: { visible: false, labelVisible: false },
        vertLine: {
          style: LineStyle.Solid,
          color: "#8f8f96",
          labelVisible: false,
        },
      },
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: "#98989f",
        fontFamily: '"Gellix", var(--font-body), sans-serif',
        fontSize: 12,
        attributionLogo: false,
      },
      timeScale: {
        fixLeftEdge: true,
        allowBoldLabels: false,
        borderVisible: false,
        tickMarkFormatter: (time: Time, tickMarkType: TickMarkType) =>
          formatTick(time, tickMarkType, range),
      },
      rightPriceScale: {
        visible: true,
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      leftPriceScale: { visible: false },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(255,255,255,.08)", style: LineStyle.Dashed },
      },
      width: container.clientWidth,
      height: CHART_HEIGHT,
    });
    const series = chart.addSeries(AreaSeries, {
      lastValueVisible: false,
      priceLineVisible: false,
      lineColor: colors.line,
      lineWidth: 2,
      topColor: colors.fill,
      bottomColor: colors.fillTransparent,
      priceFormat: {
        type: "custom",
        minMove: 0.01,
        formatter: (value: number) => `$${priceFormatter.format(value)}`,
      },
    });
    series.setData(data as unknown as AreaData[]);
    chart.timeScale().fitContent();

    const handleCrosshairMove = (event: MouseEventParams<Time>) => {
      if (
        !containerRef.current ||
        event.point === undefined ||
        event.time === undefined ||
        event.point.x < 0 ||
        event.point.x > containerRef.current.clientWidth ||
        event.point.y < 0 ||
        event.point.y > containerRef.current.clientHeight
      ) {
        setHover(null);
        return;
      }

      const seriesPoint = event.seriesData.get(series);
      if (!seriesPoint || !("value" in seriesPoint)) {
        setHover(null);
        return;
      }

      const time = Number(event.time);
      if (!Number.isFinite(time)) {
        setHover(null);
        return;
      }

      const width = containerRef.current.clientWidth;
      setHover({
        time,
        value: seriesPoint.value,
        left: Math.max(0, Math.min(event.point.x - 55, width - 55)),
        top: Math.max(0, event.point.y - 88),
      });
    };
    chart.subscribeCrosshairMove(handleCrosshairMove);

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) chart.applyOptions({ width });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
    };
  }, [points, range, trend]);

  return (
    <div className={styles.chartStage}>
      <div ref={containerRef} className={styles.chart} data-testid="asset-detail-chart" />
      {hover ? <ChartTooltip hover={hover} trend={trend} /> : null}
    </div>
  );
}

function ChartTooltip({ hover, trend }: { hover: ChartHover; trend: Trend }) {
  const date = new Date(hover.time * 1_000);
  return (
    <div
      className={`${styles.chartTooltip} ${styles[trend]}`}
      style={{ left: hover.left, top: hover.top }}
      role="status"
    >
      <span className={styles.chartTooltipPrice}>${priceFormatter.format(hover.value)}</span>
      <span className={styles.chartTooltipTime}>
        {formatTooltipDate(date)}
        <br />
        {formatTooltipTime(date)}
      </span>
    </div>
  );
}

function ChartEmpty({
  pending,
  error,
  onRetry,
}: {
  pending: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (pending) return <div className={styles.chartLoading} aria-label="Loading chart" />;

  return (
    <div className={styles.chartEmpty}>
      <span>{error ? "Unable to load chart data." : "No chart data available."}</span>
      {error ? (
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <section className={`${styles.chartCard} ${styles.neutral}`} aria-label="Loading asset chart">
      <div className={styles.skeletonHeader}>
        <span />
        <span />
      </div>
      <div className={styles.chartLoading} />
    </section>
  );
}

function ChartError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className={`${styles.chartCard} ${styles.neutral}`}>
      <div className={styles.priceBlock}>
        <h1>$-.--</h1>
        <div className={`${styles.change} ${styles.neutral}`}>$-.-- (-.--%) 24H</div>
      </div>
      <div className={styles.chartEmpty}>
        <span>Unable to load asset data.</span>
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      </div>
    </section>
  );
}

function assetCategories(detail: MarketAssetDetails): string[] {
  const tags = [...detail.asset.tags].sort((left, right) => {
    const priority = (category: string) => {
      if (category.toLowerCase().includes("asset class")) return 0;
      if (category.toLowerCase().includes("instrument")) return 1;
      return 2;
    };
    return priority(left.categoryLabel) - priority(right.categoryLabel);
  });
  const labels = tags.map((tag) => tag.tagLabel);
  return [...new Set(labels.map((label) => label.trim()).filter(Boolean))].slice(0, 3);
}

function assetTradeAvailability(detail: MarketAssetDetails): AssetTradeAvailability {
  const ethereumAvailable = detail.networks.some(
    (network) => network.chainId === ETHEREUM_CHAIN_ID
  );
  if (ethereumAvailable) {
    return { tradeable: true, title: "Asset Open for Trade", context: "Ethereum venue" };
  }

  const session = marketSessionLabel(detail.tradingStatus?.currentSession);
  return {
    tradeable: false,
    title: "Asset Paused",
    context: session ? `Unavailable in ${session}` : "Temporarily unavailable",
  };
}

function marketSessionLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/gu, "");
  if (normalized === "premarket") return "Pre-Market";
  if (normalized === "regular") return "Regular";
  if (normalized === "postmarket") return "Post-Market";
  if (normalized === "overnight") return "Overnight";
  if (normalized === "offhours") return "Off-Hours";
  return value
    .trim()
    .toLowerCase()
    .replace(/(^|[\s_-])\p{L}/gu, (letter) => letter.toUpperCase())
    .replace(/[_-]+/gu, " ");
}

function indicativeTradeOutput({
  side,
  amount,
  unitPrice,
  outputAsset,
}: {
  side: OrderSide;
  amount: string;
  unitPrice: string | null | undefined;
  outputAsset: string;
}): string | null {
  const amountValue = numberValue(amount);
  const priceValue = numberValue(unitPrice);
  if (amountValue <= 0 || priceValue <= 0) return null;
  const output = side === "buy" ? amountValue / priceValue : amountValue * priceValue;
  return Number.isFinite(output) ? formatTradeAmount(output, outputAsset) : null;
}

function formatMarketOpen(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(date);
}

function networkLabel(network: MarketAssetNetwork): string {
  const name = network.network.toLowerCase();
  if (name.includes("bnb") || name.includes("bsc")) return "BNB Chain";
  if (name.includes("sol")) return "Solana";
  if (name.includes("eth")) return "Ethereum";
  return network.network;
}

function normalizeAmount(value: string): string {
  const filtered = value.replace(/[^\d.]/gu, "");
  const [whole = "", ...decimalParts] = filtered.split(".");
  const normalized = decimalParts.length > 0 ? `${whole}.${decimalParts.join("")}` : whole;
  return normalized.slice(0, 36);
}

function formatBalance(value: bigint, decimals: number): string {
  const amount = numberValue(formatUnits(value, decimals));
  if (!Number.isFinite(amount)) return "—";
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: amount < 0.01 ? 8 : 6,
  });
}

function shortAddress(address: string): string {
  if (address.length <= 13) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function copyText(value: string): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // Clipboard access can be blocked by browser permissions without affecting the page.
  }
}

function formatShares(value: string): string {
  const number = numberValue(value);
  return Number.isFinite(number)
    ? number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })
    : value;
}

function formatCompactUsd(value: string | null | undefined): string {
  const number = numberValue(value);
  if (!Number.isFinite(number)) return "-";
  return `$${new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(number)}`;
}

function formatInteger(value: string | null | undefined): string {
  const number = numberValue(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(number)
    : "-";
}

function formatPercent(value: string | null | undefined): string {
  const number = numberValue(value);
  if (!Number.isFinite(number)) return "-";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(number)}%`;
}

function formatLimit(limit: MarketAssetSessionLimit): string {
  const number = numberValue(limit.maxActiveNotionalValueUsd);
  return Number.isFinite(number)
    ? `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(number)}`
    : "-";
}

function formatCompactLimit(limit: MarketAssetSessionLimit): string {
  const number = numberValue(limit.maxActiveNotionalValueUsd);
  if (!Number.isFinite(number)) return "-";
  if (number === 0) return "$0";
  return `$${new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(number)}`;
}

function formatMinimumAmount(value: string): string {
  const number = numberValue(value);
  if (!Number.isFinite(number)) return `$${value}`;
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(number)}`;
}

function formatLongDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function chartData(
  history: MarketAssetChartHistory | undefined,
  detail: MarketAssetDetails,
  range: MarketAssetChartRange
): ChartPoint[] {
  const source = history?.available && history.range === range ? history.primaryMarketPrice : [];
  if (source.length > 1) return historyPoints(source);
  if (range !== "1D" || !detail.asset.primaryMarket.chartAvailable) return [];

  return detail.asset.primaryMarket.priceHistory24h
    .map((point) => ({
      time: Math.floor(Date.parse(point.timestamp) / 1_000),
      value: numberValue(point.priceUsd),
    }))
    .filter(validChartPoint);
}

function historyPoints(points: MarketAssetHistoryPoint[]): ChartPoint[] {
  return points
    .map((point) => ({
      time: Math.floor(Date.parse(point.timestamp) / 1_000),
      value: numberValue(point.valueUsd),
    }))
    .filter(validChartPoint);
}

function validChartPoint(point: ChartPoint): boolean {
  return Number.isFinite(point.time) && Number.isFinite(point.value);
}

function orderedChartPoints(points: ChartPoint[]): ChartPoint[] {
  const byTime = new Map<number, ChartPoint>();
  for (const point of points) byTime.set(point.time, point);
  return [...byTime.values()].sort((left, right) => left.time - right.time);
}

function chartMovement(
  detail: MarketAssetDetails,
  points: ChartPoint[],
  range: MarketAssetChartRange
): { usd: number; percent: number } {
  if (range === "1D") {
    if (!detail.asset.primaryMarket.change24hAvailable) {
      return { usd: Number.NaN, percent: Number.NaN };
    }
    return {
      usd: numberValue(
        detail.primaryMarket?.priceChange24hUsd ?? detail.asset.primaryMarket.priceChange24hUsd
      ),
      percent: numberValue(
        detail.primaryMarket?.priceChange24hPercent ??
          detail.asset.primaryMarket.priceChange24hPercent
      ),
    };
  }

  const ordered = orderedChartPoints(points);
  if (ordered.length < 2) return { usd: Number.NaN, percent: Number.NaN };
  const current = ordered[ordered.length - 1].value;
  const usd = current - ordered[0].value;
  return { usd, percent: current === 0 ? Number.NaN : (usd / current) * 100 };
}

function chartColors(trend: Trend): {
  background: string;
  line: string;
  fill: string;
  fillTransparent: string;
} {
  if (trend === "positive") {
    return {
      background: "#101012",
      line: "#30B878",
      fill: "rgba(48,184,120,.22)",
      fillTransparent: "rgba(29,166,106,0)",
    };
  }
  if (trend === "negative") {
    return {
      background: "#101012",
      line: "#DF5B5B",
      fill: "rgba(223,91,91,.22)",
      fillTransparent: "rgba(194,58,58,0)",
    };
  }
  return {
    background: "#101012",
    line: "#929298",
    fill: "rgba(146,146,152,.2)",
    fillTransparent: "rgba(146,146,152,0)",
  };
}

function trendForValue(value: number): Trend {
  if (!Number.isFinite(value) || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}

function numberValue(value: string | null | undefined): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

function formatTradeAmount(value: number, asset: string): string {
  const isStablecoin = ["USD", "USDC", "USDT"].includes(asset.toUpperCase());
  const maximumFractionDigits = isStablecoin ? 2 : value < 0.01 ? 8 : 6;

  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits,
  })} ${asset}`;
}

function formatUsd(value: string | null | undefined): string {
  const number = numberValue(value);
  return Number.isFinite(number) ? `$${priceFormatter.format(number)}` : "$-.--";
}

function formatAbsoluteUsd(value: number): string {
  return Number.isFinite(value) ? `$${priceFormatter.format(Math.abs(value))}` : "$-.--";
}

function formatAbsolutePercent(value: number): string {
  return Number.isFinite(value) ? `${Math.abs(value).toFixed(2)}%` : "-.--%";
}

function durationLabel(range: MarketAssetChartRange): string {
  if (range === "1D") return "24H";
  if (range === "ALL") return "All Time";
  return range;
}

function formatTick(time: Time, type: TickMarkType, range: MarketAssetChartRange): string {
  const date = new Date(Number(time) * 1_000);
  if (range === "1D") {
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(
      date.getMinutes()
    )}`;
  }
  if (type === TickMarkType.Year || type === TickMarkType.Month) {
    return `${date.toLocaleString("en-US", { month: "short" })} '${String(date.getFullYear()).slice(
      -2
    )}`;
  }
  if (type === TickMarkType.DayOfMonth) {
    return `${pad(date.getDate())} ${date.toLocaleString("en-US", { month: "short" })}`;
  }
  return "";
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatTooltipDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTooltipTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("hour")}:${value("minute")}:${value("second")} ${value("timeZoneName")}`.trim();
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === "neutral") return null;
  return (
    <svg
      className={trend === "negative" ? styles.trendDown : undefined}
      viewBox="0 0 9 8"
      aria-hidden="true"
    >
      <path d="M3.557 1.034c.408-.579 1.278-.579 1.686 0l3.373 4.783c.471.669-.016 1.583-.844 1.583H1.028C.2 7.4-.287 6.486.184 5.817l3.373-4.783Z" />
    </svg>
  );
}
