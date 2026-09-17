// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  offer: true,
  evm: "0xAbC0000000000000000000000000000000000001" as string | null,
}));

vi.mock("@/features/migrate/hooks/use-offer-migration", () => ({
  useOfferMigration: () => state.offer,
}));
vi.mock("@/hooks/use-auth-session", () => ({
  useAuthSession: () => ({ evmAddress: state.evm }),
}));

import {
  useMigrationGateActive,
  writeGateDone,
  gateDoneKey,
} from "@/features/migrate/lib/gate-state";

beforeEach(() => {
  state.offer = true;
  state.evm = "0xAbC0000000000000000000000000000000000001";
  window.localStorage.clear();
});
afterEach(() => window.localStorage.clear());

describe("useMigrationGateActive", () => {
  it("is active while offered and not finished", () => {
    const { result } = renderHook(() => useMigrationGateActive());
    expect(result.current).toBe(true);
  });

  it("flips to inactive the moment the gate is finished, without a reload", () => {
    const { result } = renderHook(() => useMigrationGateActive());
    expect(result.current).toBe(true);
    act(() => writeGateDone(gateDoneKey(state.evm)));
    expect(result.current).toBe(false);
  });

  it("is inactive when the migration is not offered", () => {
    state.offer = false;
    const { result } = renderHook(() => useMigrationGateActive());
    expect(result.current).toBe(false);
  });

  // The done flag is per account: finishing on one account does not clear the
  // gate for another signed in on the same device.
  it("stays active for a different account than the one that finished", () => {
    writeGateDone(gateDoneKey("0xAbC0000000000000000000000000000000000001"));
    state.evm = "0xDeF0000000000000000000000000000000000002";
    const { result } = renderHook(() => useMigrationGateActive());
    expect(result.current).toBe(true);
  });
});
