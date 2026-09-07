"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { AssetIcon } from "@/components/ui/asset-icon";
import { SearchIcon } from "@/components/ui/icons";
import type { DepositToken } from "@/lib/deposit";

interface TokenDropdownProps {
  tokens: DepositToken[];
  selectedToken: DepositToken | null;
  onSelect: (token: DepositToken) => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  disabled?: boolean;
  open?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

function tokenKey(t: { chainId: number; address: string }): string {
  return `${t.chainId}:${t.address.toLowerCase()}`;
}

export function TokenDropdown({
  tokens,
  selectedToken,
  onSelect,
  loading,
  error,
  onRetry,
  disabled = false,
  open: controlledOpen,
  onToggle,
  onClose,
}: TokenDropdownProps) {
  const t = useTranslations("fundsFlow");
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const toggle = onToggle ?? (() => setInternalOpen((prev) => !prev));
  const handleInternalClose = useCallback(() => {
    setInternalOpen(false);
  }, []);
  const close = onClose ?? handleInternalClose;

  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedKey = selectedToken ? tokenKey(selectedToken) : null;

  const list = useMemo(() => {
    const eligible = tokens.filter((t) => t.supportsStaticAddress);
    const q = query.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter(
      (t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
    );
  }, [tokens, query]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setQuery("");
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, close]);

  // Focus search input on open
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => searchInputRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [isOpen]);

  return (
    <div className="w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-[14px] border px-4 py-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          isOpen
            ? "border-accent/40 bg-white/6"
            : "border-white/10 bg-white/4 hover:border-white/20 hover:bg-white/6"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          {selectedToken ? (
            <>
              <AssetIcon
                sym={selectedToken.symbol}
                bg="#26262b"
                size={24}
                logo={selectedToken.logoUrl}
              />
              <span className="truncate font-sans text-[14.5px] font-medium text-white">
                {selectedToken.symbol}
                <span className="ml-2 text-[12.5px] font-normal text-white/45">
                  {selectedToken.name}
                </span>
              </span>
            </>
          ) : (
            <span className="font-sans text-[14px] font-normal text-white/45">
              {loading ? t("loadingTokens") : t("searchTokens")}
            </span>
          )}
        </div>

        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={`shrink-0 text-white/50 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-white" : ""
          }`}
        >
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Inline Collapsible Dropdown Menu */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
            role="listbox"
          >
            <div className="mt-2 w-full rounded-[16px] border border-white/12 bg-black/40 p-2 shadow-lg backdrop-blur-md">
              {/* Search within dropdown */}
              <div className="flex items-center gap-2.5 rounded-[10px] border border-white/10 bg-white/4 px-3 py-2 focus-within:border-white/25">
                <SearchIcon size={15} />
                <input
                  ref={searchInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("searchTokens")}
                  className="w-full border-none bg-transparent font-sans text-[13.5px] text-white outline-none placeholder:text-white/35"
                />
              </div>

              {/* Token Options */}
              <div className="ws-no-scrollbar mt-1.5 flex max-h-[220px] flex-col gap-1 overflow-y-auto pr-0.5">
                {loading ? (
                  <div className="py-6 text-center text-[13px] font-normal text-white/50">
                    {t("loadingTokens")}
                  </div>
                ) : error ? (
                  <div className="py-6 text-center text-[13px] font-normal text-white/50">
                    {t("loadTokensError")}{" "}
                    <button onClick={onRetry} className="text-accent cursor-pointer underline">
                      {t("retry")}
                    </button>
                  </div>
                ) : list.length === 0 ? (
                  <div className="py-6 text-center text-[13px] font-normal text-white/50">
                    {t("noTokensMatch")}
                  </div>
                ) : (
                  list.map((tk) => {
                    const on = tokenKey(tk) === selectedKey;
                    return (
                      <button
                        key={tokenKey(tk)}
                        type="button"
                        role="option"
                        aria-selected={on}
                        onClick={() => {
                          onSelect(tk);
                          close();
                        }}
                        className={`flex cursor-pointer items-center justify-between rounded-[10px] px-3 py-2 text-left transition-colors ${
                          on
                            ? "bg-accent/15 text-white"
                            : "text-white/80 hover:bg-white/8 hover:text-white"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <AssetIcon sym={tk.symbol} bg="#26262b" size={26} logo={tk.logoUrl} />
                          <div className="min-w-0">
                            <span className="block truncate font-sans text-[13.5px] font-medium text-white">
                              {tk.symbol}
                            </span>
                            <span className="block truncate text-[11.5px] font-normal text-white/45">
                              {tk.name}
                            </span>
                          </div>
                        </div>
                        {on && <span className="text-accent text-[12px] font-semibold">✓</span>}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
