"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { SheetNav } from "@/components/dashboard/funds/sheet-nav";
import { NetworkTabs } from "@/components/dashboard/funds/network-tabs";
import { TokenList } from "@/components/dashboard/funds/token-list";
import { AddressPanel } from "@/components/dashboard/funds/address-panel";
import { AssetIcon } from "@/components/ui/asset-icon";
import { friendlyError } from "@/lib/errors";
import {
  isRetryableDextopusError,
  useDepositChains,
  useDepositTokens,
  useEligibleOriginChainIds,
  useStaticDepositAddress,
} from "@/hooks/use-deposit";
import { usePortfolio } from "@/hooks/use-portfolio";
import { getWalletAddress } from "@/lib/user";
import { originFamily, refundChainType } from "@/lib/deposit-catalog";
import {
  depositMinimumUsd,
  SETTLE_CHAINS,
  type DepositChain,
  type DepositToken,
  type StaticAddressRequest,
} from "@/lib/deposit";
import { matchDepositChain } from "@/lib/voice/chain-match";
import type { DepositPrefill } from "@/lib/voice/intent";

interface CryptoDepositScreenProps {
  onBack: () => void;
  // Optional voice prefill: pre-select this chain (and token, when it matches).
  initialDeposit?: DepositPrefill;
}

// Deposits always settle to USDC on Base, so every user gets one deposit
// address per origin token regardless of which chain they send from.
const settle = SETTLE_CHAINS.base;

export function CryptoDepositScreen({ onBack, initialDeposit }: CryptoDepositScreenProps) {
  const { user } = usePrivy();
  const { refetch } = usePortfolio();

  const [originChain, setOriginChain] = useState<DepositChain | null>(null);
  const [originToken, setOriginToken] = useState<DepositToken | null>(null);

  const chains = useDepositChains();
  const eligibleChains = useEligibleOriginChainIds();
  const tokens = useDepositTokens(originChain?.chainId ?? null);

  // Resolve the spoken chain NAME against Dextopus's live chain list (any chain
  // the user said — never a hardcoded subset). null when it doesn't match one we
  // offer, in which case we just leave the picker for the user.
  const prefillChain = initialDeposit ? matchDepositChain(initialDeposit.chain, chains.data) : null;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    console.log("[deposit-prefill] state", {
      initialDeposit,
      chainsLoaded: Boolean(chains.data),
      chainCount: chains.data?.length ?? 0,
      chainNames: (chains.data ?? []).map((c) => c.name),
      matchedChain: prefillChain?.name ?? null,
      originChain: originChain?.name ?? null,
      tokensLoaded: Boolean(tokens.data),
      tokenSymbols: (tokens.data ?? []).map((t) => t.symbol),
    });
  });

  // Apply the voice prefill once the async lists arrive: select the matched
  // chain, then its token. A legitimate external-sync effect (URL/data → local
  // picker state, one-shot via refs), so once a user touches the picker they are
  // never overridden.
  const prefilledChain = useRef(false);
  const prefilledToken = useRef(false);
  useEffect(() => {
    if (prefilledChain.current || !prefillChain) return;
    prefilledChain.current = true;
    setOriginChain(prefillChain);
  }, [prefillChain]);
  useEffect(() => {
    if (prefilledToken.current || !initialDeposit?.token || !tokens.data) return;
    if (!prefillChain || originChain?.chainId !== prefillChain.chainId) return;
    const want = initialDeposit.token.toUpperCase();
    const match = tokens.data.find((t) => t.symbol.toUpperCase() === want);
    if (match) {
      prefilledToken.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOriginToken(match);
    }
  }, [initialDeposit, prefillChain, originChain, tokens.data]);

  const settlementAddress = getWalletAddress(user, settle.chainType);

  // A static address needs a refund address on the origin's own VM family. The
  // network picker already hides families we cannot refund, so this resolves for
  // every offerable origin.
  const family = originChain ? originFamily(originChain.chainId) : null;
  const refundType = family ? refundChainType(family) : null;
  const refundTo = refundType ? getWalletAddress(user, refundType) : null;

  const req: StaticAddressRequest | null =
    user?.id && originChain && originToken && settlementAddress && refundTo
      ? {
          userId: user.id,
          originChainId: originChain.chainId,
          originAsset: originToken.address,
          settlementChainId: settle.chainId,
          settlementAsset: settle.usdc,
          settlementAddress,
          refundTo,
        }
      : null;

  const staticAddr = useStaticDepositAddress(req);

  const resetToken = () => setOriginToken(null);

  // Address view: a token is picked and its permanent address has been minted.
  if (originToken && originChain && staticAddr.data) {
    const minimum = depositMinimumUsd(originChain);
    return (
      <div>
        <SheetNav title={`Fund with ${originToken.symbol}`} onBack={onBack} />

        {/* Selected token + chain, with a one-tap way back to change it. */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2.5">
            <AssetIcon sym={originToken.symbol} bg="#26262b" size={26} logo={originToken.logoUrl} />
            <span className="min-w-0 truncate text-[14px] font-medium text-white">
              {originToken.symbol}
              <span className="font-normal text-white/45"> on </span>
              {originChain.name}
            </span>
          </span>
          <button
            onClick={resetToken}
            className="text-accent shrink-0 cursor-pointer text-[13px] font-semibold hover:underline"
          >
            Change
          </button>
        </div>

        <AddressPanel
          address={staticAddr.data.depositAddress}
          tokenSymbol={originToken.symbol}
          chainName={originChain.name}
        />

        {/* Minimum-deposit caution, styled as a warning banner. */}
        <div className="mt-3 flex items-start gap-2.5 rounded-[14px] border border-[#d8d8dc]/25 bg-[#d8d8dc]/8 px-4 py-3">
          <span aria-hidden className="mt-px shrink-0 text-[15px]">
            ⚠️
          </span>
          <p className="text-[12.5px] leading-normal font-normal text-white/80">
            Minimum deposit is about{" "}
            <span className="tnum font-semibold text-white">${minimum}</span>.{" "}
            <span className="text-white/55">Smaller amounts may not be credited.</span>
          </p>
        </div>

        {/* Live pending indicator — the static address credits automatically. */}
        <div className="mt-3 flex items-center justify-center gap-2 text-[13px] font-normal text-white/55">
          <span className="bg-accent h-1.5 w-1.5 animate-pulse rounded-full" />
          Waiting for your deposit…
        </div>

        <div className="ws-inset mt-3 px-4 py-3">
          <p className="text-[12.5px] leading-normal font-normal text-white/70">
            Send only <span className="font-semibold text-white">{originToken.symbol}</span> on{" "}
            <span className="font-semibold text-white">{originChain.name}</span>. Your balance is
            credited automatically as USDC — usually within a minute of the transfer confirming. You
            can leave this screen; the balance updates when it lands.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="mt-3 w-full cursor-pointer rounded-[14px] border border-white/12 bg-white/5 p-3 font-sans text-[14px] font-medium text-white hover:bg-white/10"
        >
          Refresh balance
        </button>
      </div>
    );
  }

  // Picker view: choose where to settle, then origin network + token.
  return (
    <div>
      <SheetNav
        title="Deposit crypto"
        subtitle="Send from almost any chain. It arrives as USDC in your wallet."
        onBack={onBack}
      />

      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-2 text-xs font-normal text-white/55">From network</div>
          <NetworkTabs
            chains={chains.data ?? []}
            eligibleChainIds={eligibleChains.data ?? new Set()}
            selectedId={originChain?.chainId ?? null}
            onSelect={(c) => {
              setOriginChain(c);
              setOriginToken(null);
            }}
            loading={chains.isPending || eligibleChains.isPending}
            error={chains.isError || eligibleChains.isError}
            onRetry={() => {
              chains.refetch();
              eligibleChains.refetch();
            }}
          />
        </div>

        {originChain ? (
          <div>
            <div className="mb-2 text-xs font-normal text-white/55">Token to send</div>
            <TokenList
              tokens={tokens.data ?? []}
              selected={originToken}
              onSelect={setOriginToken}
              loading={tokens.isPending}
              error={tokens.isError}
              onRetry={() => tokens.refetch()}
            />
          </div>
        ) : null}

        {req && staticAddr.isPending ? (
          <div className="py-4 text-center text-[13px] font-normal text-white/55">
            Creating your deposit address…
          </div>
        ) : null}

        {req && staticAddr.isError ? (
          <div className="text-down text-[13px] font-normal">
            {friendlyError(staticAddr.error, "We couldn't create a deposit address. Try again.")}{" "}
            {isRetryableDextopusError(staticAddr.error) ? (
              <button
                onClick={() => staticAddr.refetch()}
                className="text-accent cursor-pointer underline"
              >
                Try again
              </button>
            ) : (
              <button onClick={resetToken} className="text-accent cursor-pointer underline">
                Choose a different token
              </button>
            )}
          </div>
        ) : null}

        {originToken && !settlementAddress ? (
          <div className="border-down/25 bg-down/10 rounded-[14px] border px-4 py-3 text-[12.5px] font-normal text-white/70">
            You need a {settle.chainName} wallet to receive there. Pick another settlement network.
          </div>
        ) : null}

        {originToken && settlementAddress && !refundTo ? (
          <div className="border-down/25 bg-down/10 rounded-[14px] border px-4 py-3 text-[12.5px] font-normal text-white/70">
            Deposits from {originChain?.name} need a {refundType === "solana" ? "Solana" : "wallet"}{" "}
            address on your account for refunds. Pick another network to continue.
          </div>
        ) : null}
      </div>
    </div>
  );
}
