import { describe, expect, it } from "vitest";
import { EVENT_SCHEMA, validateEvent } from "@/lib/analytics/schema";

// One valid payload per rail, reused so each test states only what it changes.
const CRYPTO_DEPOSIT = {
  method: "crypto",
  amount_usd: 3.448275,
  source_network: "base-mainnet",
};
const BANK_DEPOSIT = {
  method: "bank",
  amount_usd: 3.448275,
  amount_ngn: 5000,
  fx_rate: 1450,
  provider: "Rubies MFB",
};

// A copy of an event with one property left out, for the "missing property"
// cases below.
function without<T extends object, K extends keyof T>(event: T, key: K): Omit<T, K> {
  const copy: Partial<T> = { ...event };
  delete copy[key];
  return copy as Omit<T, K>;
}

describe("the catalog as data", () => {
  it("declares at least one shape for every event", () => {
    // The Record<AnalyticsEventName, ...> type is what stops an event being
    // added without a shape. This catches the other half: a shape that exists
    // but says nothing, which would wave every payload through.
    for (const [name, shapes] of Object.entries(EVENT_SCHEMA)) {
      expect(shapes.length, `${name} has no shape`).toBeGreaterThan(0);
    }
  });

  it("only ever requires a property it also declares", () => {
    for (const [name, shapes] of Object.entries(EVENT_SCHEMA)) {
      for (const shape of shapes) {
        for (const key of shape.required) {
          expect(shape.props[key], `${name} requires undeclared "${key}"`).toBeDefined();
        }
      }
    }
  });
});

describe("rejecting what the spec forbids", () => {
  it("rejects a number sent as a quoted string", () => {
    // The defect this validator exists for. Mixpanel coerces on read, so a
    // quoted number looks right in the UI and silently breaks sums later.
    const violations = validateEvent("deposit_completed", { ...BANK_DEPOSIT, amount_ngn: "5000" });
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("unquoted number");
    expect(violations[0].property).toBe("amount_ngn");
  });

  it("rejects a quoted amount on bank_account_requested too", () => {
    const violations = validateEvent("bank_account_requested", {
      amount_ngn: "5000",
      fx_rate: 1450,
      reused: false,
    });
    expect(violations[0].message).toContain("unquoted number");
  });

  it("rejects a property nobody declared", () => {
    // How an event drifts away from the catalog: one call site invents a
    // property, and the spec stops describing what is being sent.
    const violations = validateEvent("deposit_completed", { ...CRYPTO_DEPOSIT, teller: "abc" });
    expect(violations[0].message).toContain('unknown property "teller"');
  });

  it("rejects a missing required property", () => {
    const withoutRate = without(BANK_DEPOSIT, "fx_rate");
    const violations = validateEvent("deposit_completed", withoutRate);
    expect(violations[0].message).toContain('missing required property "fx_rate"');
  });

  it("rejects a wrong type", () => {
    const violations = validateEvent("bank_account_requested", {
      amount_ngn: 5000,
      fx_rate: 1450,
      reused: "yes",
    });
    expect(violations[0].message).toContain("must be a boolean");
  });

  it("rejects an event that carries properties it should not", () => {
    expect(validateEvent("withdraw_opened", { amount_usd: 25 })).not.toHaveLength(0);
  });
});

describe("events with more than one shape", () => {
  it("accepts either funding rail", () => {
    expect(validateEvent("deposit_completed", CRYPTO_DEPOSIT)).toEqual([]);
    expect(validateEvent("deposit_completed", BANK_DEPOSIT)).toEqual([]);
  });

  it("refuses to let one rail borrow the other's properties", () => {
    // Defect 1 in shape form: a chain deposit carrying Naira figures, or a
    // Naira one claiming a source network, means the rails have blurred again.
    expect(validateEvent("deposit_completed", { ...CRYPTO_DEPOSIT, amount_ngn: 5000 })).not.toEqual(
      []
    );
    expect(
      validateEvent("deposit_completed", { ...BANK_DEPOSIT, source_network: "base-mainnet" })
    ).not.toEqual([]);
  });

  it("keeps the deposit's provider and the withdrawal's bank apart", () => {
    // `bank` on a deposit meant the rail while `bank` on a withdrawal meant
    // the customer. One name, two meanings. Neither event accepts the other's.
    expect(validateEvent("deposit_completed", { ...BANK_DEPOSIT, provider: "Rubies MFB" })).toEqual(
      []
    );
    const swapped = { ...BANK_DEPOSIT, bank: "Rubies MFB" };
    delete (swapped as Record<string, unknown>).provider;
    expect(validateEvent("deposit_completed", swapped)).not.toEqual([]);
  });

  it("complains about the closest shape, not about every variant", () => {
    // A bank deposit missing its rate should read as one missing property, not
    // as everything that also makes it not a crypto deposit.
    const withoutRate = without(BANK_DEPOSIT, "fx_rate");
    expect(validateEvent("deposit_completed", withoutRate)).toHaveLength(1);
  });
});

describe("trade amounts", () => {
  const SPOT_SELL = {
    vertical: "spot",
    asset: "DOGE",
    side: "sell",
    amount_usd: 0.99,
    token_quantity: 10.14812065,
    amount_source: "quote",
  };

  it("accepts a sell that carries its dollar value and its token quantity", () => {
    expect(validateEvent("trade_completed", SPOT_SELL)).toEqual([]);
  });

  it("refuses a sell without token_quantity, so amount_usd cannot quietly carry tokens again", () => {
    // The units bug: sells reported the token quantity as amount_usd, which
    // put $1.26M of trading volume into Mixpanel that never happened.
    const violations = validateEvent("trade_completed", without(SPOT_SELL, "token_quantity"));
    expect(violations.map((v) => v.property)).toContain("token_quantity");
  });

  it("refuses a sell preview without token_quantity too", () => {
    const violations = validateEvent("trade_previewed", {
      vertical: "memecoin",
      asset: "TOSHI",
      side: "sell",
      amount_usd: 5,
    });
    expect(violations.map((v) => v.property)).toContain("token_quantity");
  });

  it("requires every completed trade to say where its dollar figure came from", () => {
    const violations = validateEvent("trade_completed", without(SPOT_SELL, "amount_source"));
    expect(violations.map((v) => v.property)).toContain("amount_source");
  });

  it("does not require token_quantity on a buy", () => {
    const buy = { ...without(SPOT_SELL, "token_quantity"), side: "buy" };
    expect(validateEvent("trade_completed", buy)).toEqual([]);
  });
});

describe("landing_viewed", () => {
  it("names which landing page was opened", () => {
    expect(validateEvent("landing_viewed", { page: "landing" })).toEqual([]);
    expect(validateEvent("landing_viewed", {}).map((v) => v.property)).toContain("page");
  });
});

describe("failure reasons", () => {
  it("accepts a reason from the agreed vocabulary, with a coded detail", () => {
    expect(
      validateEvent("trade_failed", {
        vertical: "memecoin",
        asset: "PEPE",
        reason: "no_route",
        reason_detail: "NO_SWAP_ROUTE",
      })
    ).toEqual([]);
  });

  it("refuses a reason outside the vocabulary, so one failure has one name", () => {
    // "order_failed", "trade_failed" and "failed" all meant the same thing.
    const violations = validateEvent("trade_failed", {
      vertical: "memecoin",
      asset: "PEPE",
      reason: "order_failed",
    });
    expect(violations.map((v) => v.property)).toContain("reason");
  });

  it("holds deposit failures to the same vocabulary", () => {
    expect(
      validateEvent("deposit_failed", { method: "crypto", reason: "address_unavailable" })
    ).toEqual([]);
    expect(
      validateEvent("deposit_failed", { method: "crypto", reason: "nope" }).map((v) => v.property)
    ).toContain("reason");
  });
});

describe("trade_submitted", () => {
  it("carries the order id its completion will share, and a sell's quantity", () => {
    const sell = {
      vertical: "spot",
      asset: "DOGE",
      side: "sell",
      amount_usd: 1,
      token_quantity: 10,
      order_id: "req-1",
    };
    expect(validateEvent("trade_submitted", sell)).toEqual([]);
    expect(
      validateEvent("trade_submitted", without(sell, "order_id")).map((v) => v.property)
    ).toContain("order_id");
    expect(
      validateEvent("trade_submitted", without(sell, "token_quantity")).map((v) => v.property)
    ).toContain("token_quantity");
  });
});
