"use client";

import { useState } from "react";
import {
  formatUsdE6,
  parseUsdE6,
  sportsSlipSelection,
  toggleSlipSelection,
  type MarketSlipSelection,
} from "../bet-slip";
import { useSinglesBatchOrder } from "../hooks/use-singles-batch-order";
import { updateMarketSlip, usePersistedMarketSlip } from "../market-slip-storage";
import type { SinglesBetReceipt } from "../singles-receipt";
import type { MarketCategory, SportsNavKey } from "../types";
import { BetSlipPanel, type BetSlipTab } from "./bet-slip-panel";
import { DiscoveryMarketBoard } from "./discovery-market-board";
import { SinglesBetReceiptModal } from "./singles-bet-receipt-modal";
import { SportsMarketBoard } from "./sports-market-board";

interface MarketsWorkspaceProps {
  activeCategory: MarketCategory;
  activeSportsNav: SportsNavKey;
}

export function MarketsWorkspace({ activeCategory, activeSportsNav }: MarketsWorkspaceProps) {
  const { selections, stake } = usePersistedMarketSlip();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BetSlipTab>("singles");
  const [lookedUpReceipt, setLookedUpReceipt] = useState<SinglesBetReceipt | null>(null);
  const executionState = useSinglesBatchOrder();
  const selectedIds = new Set(selections.map(({ id }) => id));

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
      <div className="mx-auto grid w-full max-w-[1340px] gap-4 px-4 py-5 sm:px-5 xl:grid-cols-[minmax(0,1000px)_320px] xl:px-0">
        <div className="min-w-0">
          {activeCategory === "sports" ? (
            <SportsMarketBoard
              key={activeSportsNav}
              activeSportsNav={activeSportsNav}
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
        className="fixed right-3 bottom-3 left-3 z-[55] flex h-14 cursor-pointer items-center justify-between rounded-[11px] border border-white/14 bg-[linear-gradient(180deg,#29292e_0%,#1b1b1f_100%)] px-4 shadow-[0_18px_60px_rgba(0,0,0,0.7)] xl:hidden"
      >
        <span className="flex items-center gap-2 text-[13px] font-extrabold text-white">
          {activeTab === "cashout" ? "Active bets" : "Bet slip"}
          <span className="grid min-w-6 place-items-center rounded-full bg-white/12 px-1.5 py-0.5 text-[10px]">
            {selections.length}
          </span>
        </span>
        <span className="text-[11px] font-bold text-white/48">
          {activeTab === "cashout" ? "Cashout" : `Stake ${formatUsdE6(parseUsdE6(stake) ?? 0n)}`}
        </span>
      </button>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[70] bg-black/72 backdrop-blur-[2px] xl:hidden">
          <button
            type="button"
            aria-label="Close bet slip"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <div className="absolute right-0 bottom-0 left-0 max-h-[88dvh] overflow-y-auto p-3">
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
