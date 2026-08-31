"use client";

import { useId, useState, type FormEvent } from "react";
import { friendlyError } from "@/lib/errors";
import { fetchSinglesTicket, singlesTicketToReceipt } from "../api";
import { BOOKING_CODE_LENGTH, isBookingCode, normalizeBookingCodeInput } from "../booking-code";
import type { SinglesBetReceipt } from "../singles-receipt";

interface BookingCodeLookupProps {
  onLoaded: (receipt: SinglesBetReceipt) => void;
}

export function BookingCodeLookup({ onLoaded }: BookingCodeLookupProps) {
  const inputId = useId();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isBookingCode(code) || loading) return;

    setLoading(true);
    setError(null);
    try {
      const ticket = await fetchSinglesTicket(code);
      onLoaded(singlesTicketToReceipt(ticket));
    } catch (cause) {
      setError(friendlyError(cause, "That booking code could not be found."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(event) => void loadTicket(event)} className="border-b border-white/8 p-3">
      <label
        htmlFor={inputId}
        className="text-[9px] font-black tracking-[0.12em] text-white/35 uppercase"
      >
        Booking code
      </label>
      <div className="mt-2 flex h-11 overflow-hidden rounded-[8px] border border-white/11 bg-black/30 focus-within:border-white/28">
        <input
          id={inputId}
          value={code}
          onChange={(event) => {
            setCode(normalizeBookingCodeInput(event.target.value));
            if (error) setError(null);
          }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          maxLength={BOOKING_CODE_LENGTH}
          placeholder="e.g. YN65GR"
          aria-invalid={error != null}
          className="min-w-0 flex-1 bg-transparent px-3 text-[14px] font-black tracking-[0.14em] text-white uppercase outline-none placeholder:text-[10px] placeholder:tracking-normal placeholder:text-white/22"
        />
        <button
          type="submit"
          disabled={!isBookingCode(code) || loading}
          className="m-1 min-w-16 cursor-pointer rounded-[6px] bg-[linear-gradient(180deg,#dedee2_0%,#aaaab0_100%)] px-3 text-[10px] font-black text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {loading ? "Loading..." : "Load"}
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-[9px] leading-4 font-semibold text-red-300/85">{error}</p>
      ) : null}
    </form>
  );
}
