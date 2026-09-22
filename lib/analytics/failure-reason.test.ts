import { describe, expect, it } from "vitest";
import { failureReason, failureReasonForStage } from "@/lib/analytics/failure-reason";

// A service error as lib/meme/api throws it: recognised by name and code.
function tradeError(code: string, message = "service wording") {
  return Object.assign(new Error(message), { name: "TradeApiError", code });
}

describe("failureReason", () => {
  it("calls a wallet the user dismissed a cancellation, not a failed trade", () => {
    expect(failureReason(Object.assign(new Error("x"), { code: 4001 }))).toEqual({
      reason: "user_cancelled",
    });
    expect(failureReason(new Error("User rejected the request."))).toEqual({
      reason: "user_cancelled",
    });
  });

  it("maps the trade service's codes onto the agreed vocabulary", () => {
    expect(failureReason(tradeError("INSUFFICIENT_BALANCE"))).toEqual({
      reason: "insufficient_balance",
      reason_detail: "INSUFFICIENT_BALANCE",
    });
    expect(failureReason(tradeError("NO_SWAP_ROUTE")).reason).toBe("no_route");
    expect(failureReason(tradeError("NO_ROUTE")).reason).toBe("no_route");
    expect(failureReason(tradeError("SIMULATION_FAILED")).reason).toBe("simulation_failed");
    expect(failureReason(tradeError("HIGH_PRICE_IMPACT")).reason).toBe("slippage_exceeded");
    expect(failureReason(tradeError("PROVIDER_ERROR")).reason).toBe("provider_timeout");
    expect(failureReason(tradeError("SERVICE_UNAVAILABLE")).reason).toBe("provider_timeout");
  });

  it("reads the common failures out of a message when there is no code", () => {
    expect(failureReason(new Error("execution reverted: insufficient balance")).reason).toBe(
      "insufficient_balance"
    );
    expect(failureReason(new Error("Too little received: slippage")).reason).toBe(
      "slippage_exceeded"
    );
    expect(failureReason(new TypeError("Failed to fetch")).reason).toBe("provider_timeout");
  });

  it("keeps a code it cannot place as the detail, and never the raw message", () => {
    // Provider text can quote back what the user typed.
    expect(failureReason(tradeError("QUOTE_EXPIRED", "wallet 0xabc typed 12"))).toEqual({
      reason: "unknown",
      reason_detail: "QUOTE_EXPIRED",
    });
    expect(failureReason(new Error("something odd about 0xabc"))).toEqual({ reason: "unknown" });
  });
});

describe("failureReasonForStage", () => {
  it("names an order the venue refunded or failed", () => {
    expect(failureReasonForStage("refunded")).toEqual({
      reason: "unknown",
      reason_detail: "refunded",
    });
    expect(failureReasonForStage("failed")).toEqual({ reason: "unknown", reason_detail: "failed" });
  });
});
