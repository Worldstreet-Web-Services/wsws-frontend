import { describe, expect, it } from "vitest";

import { serverPendingRwaSettlementsSnapshot } from "@/lib/trade/pending-settlement";

describe("pending RWA settlement store", () => {
  it("returns a referentially stable server snapshot", () => {
    const first = serverPendingRwaSettlementsSnapshot();
    const second = serverPendingRwaSettlementsSnapshot();

    expect(second).toBe(first);
    expect(second).toEqual([]);
  });
});
