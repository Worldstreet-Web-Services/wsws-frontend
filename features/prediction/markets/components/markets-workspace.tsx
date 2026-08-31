"use client";

import { useState } from "react";
import {
  formatReferenceOdds,
  sportsSlipSelection,
  summedReferenceOddsE6,
  toggleSlipSelection,
  type MarketSlipSelection,
} from "../bet-slip";
import { useSinglesBatchOrder } from "../hooks/use-singles-batch-order";
import { updateMarketSlip, usePersistedMarketSlip } from "../market-slip-storage";
import type { SinglesBetReceipt } from "../singles-receipt";
import { isNormalSportCategory, type MarketCategory, type SportsLeagueKey } from "../types";
import { BetSlipPanel, type BetSlipTab } from "./bet-slip-panel";
import { DiscoveryMarketBoard } from "./discovery-market-board";
import { SinglesBetReceiptModal } from "./singles-bet-receipt-modal";
import { SportsMarketBoard } from "./sports-market-board";

interface MarketsWorkspaceProps {
  activeCategory: MarketCategory;
  activeLeague: SportsLeagueKey;
}

export function MarketsWorkspace({ activeCategory, activeLeague }: MarketsWorkspaceProps) {
  const { selections, stake } = usePersistedMarketSlip();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BetSlipTab>("singles");
  const [lookedUpReceipt, setLookedUpReceipt] = useState<SinglesBetReceipt | null>(null);
  const executionState = useSinglesBatchOrder();
  const selectedIds = new Set(selections.map(({ id }) => id));
  const floatingLabel =
    selections.length > 0
      ? formatReferenceOdds(summedReferenceOddsE6(selections))
      : activeTab === "cashout"
        ? "Positions"
        : "Slip";
  const floatingLabelSize =
    floatingLabel.length > 9
      ? "text-[8px] tracking-[-0.04em]"
      : floatingLabel.length > 7
        ? "text-[9px] tracking-[-0.03em]"
        : floatingLabel.length > 5
          ? "text-[11px] tracking-[-0.02em]"
          : "text-[13px]";

  function toggleSelection(selection: MarketSlipSelection) {
    updateMarketSlip((current) => ({
      ...current,
      selections: toggleSlipSelection(current.selections, selection),
    }));
    setActiveTab("singles");
  }

  function removeSelection(selectionId: string) {
    updateMarketSlip((current) => ({
      ...current,
      selections: current.selections.filter(({ id }) => id !== selectionId),
    }));
    if (selections.length === 1) setMobileOpen(false);
  }

  function clearSelections() {
    updateMarketSlip((current) => ({ ...current, selections: [] }));
  }

  function changeStake(nextStake: string) {
    updateMarketSlip((current) => ({ ...current, stake: nextStake }));
  }

  function viewActiveBets() {
    setLookedUpReceipt(null);
    executionState.dismissReceipt();
    setActiveTab("cashout");
    setMobileOpen(true);
  }

  const slip = (
    <BetSlipPanel
      selections={selections}
      onRemove={removeSelection}
      onClear={clearSelections}
      stake={stake}
      onStakeChange={changeStake}
      executionState={executionState}
      onTicketLoaded={(receipt) => {
        setLookedUpReceipt(receipt);
        setMobileOpen(false);
      }}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onPlaced={(receipt) => {
        if (receipt.acceptedCount > 0) clearSelections();
        setMobileOpen(false);
      }}
    />
  );

  return (
    <>
      <div className="mx-auto grid w-full max-w-[1340px] gap-4 px-0 pt-2 pb-24 sm:px-5 sm:py-5 xl:grid-cols-[minmax(0,1000px)_320px] xl:px-0">
        <div className="min-w-0">
          {isNormalSportCategory(activeCategory) ? (
            <SportsMarketBoard
              key={`${activeCategory}:${activeLeague}`}
              sport={activeCategory}
              activeLeague={activeLeague}
              selectedIds={selectedIds}
              onSelect={(selection) => {
                const slipSelection = sportsSlipSelection(selection);
                if (slipSelection) toggleSelection(slipSelection);
              }}
              onRemoveSelection={removeSelection}
            />
          ) : (
            <DiscoveryMarketBoard
              key={activeCategory}
              category={activeCategory}
              selectedIds={selectedIds}
              onSelect={toggleSelection}
            />
          )}
        </div>

        <aside className="sticky top-[178px] hidden self-start xl:block">{slip}</aside>
      </div>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label={`Open selections with ${selections.length} selected markets`}
        title={floatingLabel}
        className="fixed right-4 bottom-[max(18px,env(safe-area-inset-bottom))] z-[55] grid size-16 cursor-pointer place-items-center rounded-full border border-white/28 bg-[linear-gradient(145deg,#a4a6aa_0%,#65686e_28%,#303238_65%,#777a80_100%)] p-1.5 text-white shadow-[0_12px_32px_rgba(0,0,0,0.55),inset_1px_1px_1px_rgba(255,255,255,0.42),inset_-2px_-3px_5px_rgba(0,0,0,0.35)] transition-transform active:scale-95 xl:hidden"
      >
        {selections.length > 0 ? (
          <span className="absolute -top-1 -right-1 grid size-6 place-items-center rounded-full bg-white text-[10px] font-black text-black shadow-[1px_2px_8px_rgba(0,0,0,0.3)]">
            {selections.length}
          </span>
        ) : null}
        <span
          className={`w-full text-center leading-none font-black whitespace-nowrap tabular-nums ${floatingLabelSize}`}
        >
          {floatingLabel}
        </span>
      </button>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[70] bg-black/80 xl:hidden">
          <button
            type="button"
            aria-label="Close selections"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <div className="absolute right-0 bottom-0 left-0 max-h-[calc(100dvh-54px)] overflow-hidden">
            <BetSlipPanel
              selections={selections}
              onRemove={removeSelection}
              onClear={() => {
                clearSelections();
                setMobileOpen(false);
              }}
              stake={stake}
              onStakeChange={changeStake}
              executionState={executionState}
              onTicketLoaded={(receipt) => {
                setLookedUpReceipt(receipt);
                setMobileOpen(false);
              }}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onPlaced={(receipt) => {
                if (receipt.acceptedCount > 0) clearSelections();
                setMobileOpen(false);
              }}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <SinglesBetReceiptModal
        receipt={lookedUpReceipt ?? executionState.receipt}
        onClose={() => {
          if (lookedUpReceipt) {
            setLookedUpReceipt(null);
          } else {
            executionState.dismissReceipt();
          }
        }}
        onRetrySave={executionState.retryReceiptSave}
        onViewActiveBets={viewActiveBets}
      />
    </>
  );
}
