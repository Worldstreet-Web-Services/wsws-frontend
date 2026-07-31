import { describe, expect, it } from "vitest";
import {
  formatUsdc,
  formatUsdcWithSymbol,
  isTxHash,
  parseUsdc,
  potBreakdown,
  requireUsdc,
  swissPotBreakdown,
  usdcToApi,
} from "@/lib/casino/cashier-money";

// This is a payout figure a player is owed, so every case here is exact. The
// service speaks decimal strings and keeps micro-USDC internally; anything that
// drifts between the two forms shortchanges somebody.

const ONE_USDC = 1_000_000n;

describe("parsing", () => {
  it("reads a decimal string into exact micro-USDC", () => {
    expect(parseUsdc("10")).toBe(10n * ONE_USDC);
    expect(parseUsdc("9.5")).toBe(9_500_000n);
    expect(parseUsdc("0.000001")).toBe(1n);
  });

  it("round-trips through the API form without drift", () => {
    for (const value of ["10", "9.5", "1000.1", "0.000001", "333.37"]) {
      expect(usdcToApi(parseUsdc(value) as bigint)).toBe(value);
    }
  });

  it("refuses more precision than USDC has", () => {
    // Truncating here would silently round somebody's stake down.
    expect(parseUsdc("1.1234567")).toBeNull();
  });

  it("refuses what is not a plain decimal", () => {
    expect(parseUsdc("1,000")).toBeNull();
    expect(parseUsdc("abc")).toBeNull();
    expect(parseUsdc("")).toBeNull();
    expect(parseUsdc(".")).toBeNull();
    expect(parseUsdc(null)).toBeNull();
    expect(parseUsdc(undefined)).toBeNull();
  });

  it("distinguishes an unreadable amount from zero", () => {
    // A balance that failed to parse must never render as an honest "0".
    expect(parseUsdc("abc")).toBeNull();
    expect(parseUsdc("0")).toBe(0n);
  });

  it("throws with a usable message on bad user input", () => {
    expect(() => requireUsdc("abc")).toThrow(/decimals/i);
    expect(() => requireUsdc("0")).toThrow(/greater than zero/i);
    expect(() => requireUsdc("1.1234567")).toThrow(/decimals/i);
    expect(requireUsdc("2.5")).toBe(2_500_000n);
  });
});

describe("head-to-head pot", () => {
  it("splits a 10 USDC stake at 5% the way the service does", () => {
    const { potMicro, feeMicro, payoutMicro } = potBreakdown(10n * ONE_USDC, 500);
    expect(usdcToApi(potMicro)).toBe("20");
    expect(usdcToApi(feeMicro)).toBe("1");
    expect(usdcToApi(payoutMicro)).toBe("19");
  });

  it("always has the fee and the payout add back to the pot", () => {
    // Any gap here is money that exists in the UI and nowhere else.
    for (const stake of ["0.000001", "0.33", "10", "1000.1", "333.37"]) {
      const staked = parseUsdc(stake) as bigint;
      const { potMicro, feeMicro, payoutMicro } = potBreakdown(staked, 500);
      expect(feeMicro + payoutMicro).toBe(potMicro);
      expect(potMicro).toBe(staked * 2n);
    }
  });

  it("leaves a rounding remainder with the winner, never the house", () => {
    // 1 micro-USDC each side: a 5% fee is a fraction of a unit and floors to
    // zero, so the winner takes the pair.
    const { feeMicro, payoutMicro } = potBreakdown(1n, 500);
    expect(feeMicro).toBe(0n);
    expect(payoutMicro).toBe(2n);
  });

  it("takes no fee when the service reports none", () => {
    const { feeMicro, payoutMicro } = potBreakdown(10n * ONE_USDC, 0);
    expect(feeMicro).toBe(0n);
    expect(payoutMicro).toBe(20n * ONE_USDC);
  });

  it("ignores a nonsense fee rather than inventing a charge", () => {
    expect(potBreakdown(10n * ONE_USDC, Number.NaN).feeMicro).toBe(0n);
    expect(potBreakdown(10n * ONE_USDC, -100).feeMicro).toBe(0n);
  });
});

describe("swiss pot", () => {
  it("pays the winner every entry fee minus the cut", () => {
    const { potMicro, feeMicro, payoutMicro } = swissPotBreakdown(5n * ONE_USDC, 4, 500);
    expect(usdcToApi(potMicro)).toBe("20");
    expect(usdcToApi(feeMicro)).toBe("1");
    expect(usdcToApi(payoutMicro)).toBe("19");
  });

  it("is empty with nobody entered", () => {
    expect(swissPotBreakdown(5n * ONE_USDC, 0, 500).potMicro).toBe(0n);
  });

  it("keeps fee plus payout equal to the pot at awkward entrant counts", () => {
    for (const entrants of [1, 3, 7, 13]) {
      const { potMicro, feeMicro, payoutMicro } = swissPotBreakdown(
        parseUsdc("3.33") as bigint,
        entrants,
        500
      );
      expect(feeMicro + payoutMicro).toBe(potMicro);
    }
  });
});

describe("display", () => {
  it("groups thousands and drops a pointless decimal tail", () => {
    expect(formatUsdc(1000n * ONE_USDC)).toBe("1,000");
    expect(formatUsdc(1_000_500_000n)).toBe("1,000.5");
    expect(formatUsdcWithSymbol(10n * ONE_USDC)).toBe("10 USDC");
  });

  it("shows an unreadable amount as unknown rather than zero", () => {
    expect(formatUsdc(null)).toBe("—");
    expect(formatUsdcWithSymbol(null)).toBe("—");
  });

  it("never rounds a figure up past what the player has", () => {
    // 0.999999 available must not read as "1", which would invite a withdrawal
    // the service then refuses.
    expect(formatUsdc(999_999n)).toBe("0.99");
  });
});

describe("transaction hashes", () => {
  it("accepts a real hash and rejects everything else", () => {
    expect(isTxHash(`0x${"a".repeat(64)}`)).toBe(true);
    expect(isTxHash(`0x${"A".repeat(64)}`)).toBe(true);
    expect(isTxHash(` 0x${"a".repeat(64)} `)).toBe(true);
    expect(isTxHash(`0x${"a".repeat(63)}`)).toBe(false);
    expect(isTxHash(`0x${"a".repeat(65)}`)).toBe(false);
    expect(isTxHash("a".repeat(64))).toBe(false);
    expect(isTxHash(`0x${"z".repeat(64)}`)).toBe(false);
    expect(isTxHash("")).toBe(false);
  });
});
