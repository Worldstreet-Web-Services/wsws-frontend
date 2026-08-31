import { describe, expect, it } from "vitest";
import { resolveGasPolicyId } from "@/lib/server/gas-policy";

const SHARED = "shared-base-policy";
const POLYGON = "polygon-only-policy";

describe("resolveGasPolicyId", () => {
  it("gives Polygon its own policy, not the shared one", () => {
    const env = {
      ALCHEMY_GAS_POLICY_ID: SHARED,
      ALCHEMY_POLYGON_GAS_POLICY_ID: POLYGON,
    } as NodeJS.ProcessEnv;
    expect(resolveGasPolicyId("polygon-mainnet", env)).toBe(POLYGON);
  });

  it("leaves every other sponsored chain on the shared policy, so this change is additive", () => {
    const env = {
      ALCHEMY_GAS_POLICY_ID: SHARED,
      ALCHEMY_POLYGON_GAS_POLICY_ID: POLYGON,
    } as NodeJS.ProcessEnv;
    expect(resolveGasPolicyId("base-mainnet", env)).toBe(SHARED);
    expect(resolveGasPolicyId("arb-mainnet", env)).toBe(SHARED);
  });

  // Falling back to a policy scoped to another network is the original bug: the
  // bundler answers "Invalid fields set on User Operation" instead of anything
  // a reader could act on.
  it("returns nothing for Polygon rather than falling back to Base's policy", () => {
    const env = { ALCHEMY_GAS_POLICY_ID: SHARED } as NodeJS.ProcessEnv;
    expect(resolveGasPolicyId("polygon-mainnet", env)).toBeUndefined();
  });

  it("treats an empty or whitespace value as unset", () => {
    expect(
      resolveGasPolicyId("polygon-mainnet", {
        ALCHEMY_POLYGON_GAS_POLICY_ID: "   ",
      } as NodeJS.ProcessEnv)
    ).toBeUndefined();
    expect(
      resolveGasPolicyId("base-mainnet", { ALCHEMY_GAS_POLICY_ID: "" } as NodeJS.ProcessEnv)
    ).toBeUndefined();
  });

  it("returns nothing when no policy is configured at all", () => {
    expect(resolveGasPolicyId("base-mainnet", {} as NodeJS.ProcessEnv)).toBeUndefined();
  });
});
