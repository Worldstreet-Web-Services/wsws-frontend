"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { SearchIcon } from "@/components/ui/icons";
import type { RampBank } from "@/lib/ramping/orders";

export interface SelectedBank {
  uuid: string;
  name: string;
  railName: string;
  initials: string;
  color: string;
}

const AVATAR_COLORS = [
  "#3b6ea5",
  "#8b5cf6",
  "#c2410c",
  "#0f766e",
  "#a21caf",
  "#b45309",
  "#2563eb",
  "#be123c",
  "#4d7c0f",
  "#0891b2",
];

export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initialsForName(name: string): string {
  const words = name
    .replace(/[^\p{L}\s]/gu, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const second = words[1]?.[0] ?? words[0]?.[1] ?? "";
  return (first + second).toUpperCase() || "?";
}

export function BankAvatar({
  initials,
  color,
  size = 24,
}: {
  initials: string;
  color: string;
  size?: number;
}) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-sans text-[11px] font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: color }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

interface BankDropdownProps {
  banks: RampBank[];
  popularBanks: SelectedBank[];
  selectedBank: SelectedBank | null;
  onSelect: (bank: SelectedBank) => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  disabled?: boolean;
  open?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

export function BankDropdown({
  banks,
  popularBanks,
  selectedBank,
  onSelect,
  loading,
  error,
  onRetry,
  disabled = false,
  open: controlledOpen,
  onToggle,
  onClose,
}: BankDropdownProps) {
  const t = useTranslations("bankWithdraw");
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

  const allBanks = useMemo(() => {
    return (banks ?? [])
      .map((b) => ({
        uuid: b.uuid,
        name: b.name,
        railName: b.name,
        initials: initialsForName(b.name),
        color: colorForName(b.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [banks]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allBanks;
    return allBanks.filter((b) => b.name.toLowerCase().includes(q));
  }, [allBanks, query]);

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
          {selectedBank ? (
            <>
              <BankAvatar initials={selectedBank.initials} color={selectedBank.color} size={24} />
              <span className="truncate font-sans text-[14.5px] font-medium text-white">
                {selectedBank.name}
              </span>
            </>
          ) : (
            <span className="font-sans text-[14px] font-normal text-white/45">
              {loading ? t("loadingBanks") : t("selectBank")}
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
                  placeholder={t("searchBank")}
                  className="w-full border-none bg-transparent font-sans text-[13.5px] text-white outline-none placeholder:text-white/35"
                />
              </div>

              {/* Popular Banks Quick-Pick Tiles when query is empty */}
              {!query.trim() && popularBanks.length > 0 && (
                <div className="mt-2 px-1 pb-1">
                  <div className="mb-1.5 text-[11px] font-medium tracking-[0.04em] text-white/40 uppercase">
                    {t("popular")}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {popularBanks.slice(0, 6).map((b) => {
                      const on = b.uuid === selectedBank?.uuid;
                      return (
                        <button
                          key={b.uuid}
                          type="button"
                          role="option"
                          aria-selected={on}
                          onClick={() => {
                            onSelect(b);
                            close();
                          }}
                          className={`flex cursor-pointer items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-left transition-colors ${
                            on
                              ? "bg-accent/15 text-white"
                              : "bg-white/4 text-white/80 hover:bg-white/8 hover:text-white"
                          }`}
                        >
                          <BankAvatar initials={b.initials} color={b.color} size={22} />
                          <span className="min-w-0 flex-1 truncate font-sans text-[12.5px] font-medium text-white">
                            {b.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bank Options */}
              <div className="ws-no-scrollbar mt-1.5 flex max-h-[220px] flex-col gap-1 overflow-y-auto pr-0.5">
                {loading ? (
                  <div className="py-6 text-center text-[13px] font-normal text-white/50">
                    {t("loadingBanks")}
                  </div>
                ) : error ? (
                  <div className="py-6 text-center text-[13px] font-normal text-white/50">
                    {t("banksFailed")}{" "}
                    <button onClick={onRetry} className="text-accent cursor-pointer underline">
                      {t("retry")}
                    </button>
                  </div>
                ) : list.length === 0 ? (
                  <div className="py-6 text-center text-[13px] font-normal text-white/50">
                    {t("noBankMatch")}
                  </div>
                ) : (
                  list.map((b) => {
                    const on = b.uuid === selectedBank?.uuid;
                    return (
                      <button
                        key={b.uuid}
                        type="button"
                        role="option"
                        aria-selected={on}
                        onClick={() => {
                          onSelect(b);
                          close();
                        }}
                        className={`flex cursor-pointer items-center justify-between rounded-[10px] px-3 py-2 text-left transition-colors ${
                          on
                            ? "bg-accent/15 text-white"
                            : "text-white/80 hover:bg-white/8 hover:text-white"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <BankAvatar initials={b.initials} color={b.color} size={24} />
                          <span className="truncate font-sans text-[13.5px] font-medium">
                            {b.name}
                          </span>
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
