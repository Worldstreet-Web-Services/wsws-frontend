import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Every action that changes a balance must refresh the reads.
 *
 * This is asserted structurally rather than by rendering, because the failure
 * it guards is a silent one: a new action lands, nobody wires invalidation,
 * and the card shows a stale balance until the next poll. That reads as "the
 * app is broken" and is invisible in a component test that only checks the
 * request went out.
 */
const HOOKS = readFileSync(join(process.cwd(), "features/portfolio/hooks/use-kash.ts"), "utf8");
const SEND = readFileSync(
  join(process.cwd(), "features/portfolio/components/kash-send-modal.tsx"),
  "utf8"
);

describe("balance-changing actions refresh on success", () => {
  it.each(["useKashPurchase", "useKashConversion", "useKashSubscribe", "useKashClaim"])(
    "%s invalidates when it resolves",
    (hook) => {
      const body = HOOKS.slice(HOOKS.indexOf(`export function ${hook}(`));
      const end = body.indexOf("\nexport function ");
      expect(end === -1 ? body : body.slice(0, end)).toContain("onSuccess: invalidate");
    }
  );

  it("the KSH send refreshes too, though it is not a mutation", () => {
    // A send is a raw on-chain transfer, so nothing invalidates on its behalf
    // and the card kept showing the pre-send balance.
    expect(SEND).toContain("invalidateKash()");
  });
});

describe("refresh survives chain propagation", () => {
  it("re-checks after the write, not only at the moment it resolves", () => {
    // A mint confirms while the RPC replica the engine reads is still a block
    // behind, so a single immediate refetch returns the pre-transaction
    // balance and a successful claim looks like it did nothing.
    expect(HOOKS).toContain("CHAIN_SETTLE_RETRIES_MS");
    const delays = HOOKS.match(/CHAIN_SETTLE_RETRIES_MS = \[([^\]]+)\]/)?.[1] ?? "";
    expect(delays.split(",").length).toBeGreaterThanOrEqual(2);
  });

  it("polls fast enough that outside changes feel live", () => {
    // Points now arrive from outside the app entirely; a minute of lag reads
    // as "they never arrived".
    const poll = Number(HOOKS.match(/ACCOUNT_POLL_MS = (\d+)/)?.[1] ?? 0);
    expect(poll).toBeGreaterThan(0);
    expect(poll).toBeLessThanOrEqual(15);
  });

  it("stops polling while the tab is backgrounded, and catches up on return", () => {
    // This used to assert the opposite. A ten second poll that never slept was
    // the most requested endpoint in the app by a factor of fifteen, measured
    // off the dev server: one forgotten tab cost 360 authed reads an hour with
    // nobody watching, and a background tab cannot show anyone a new number.
    //
    // The behaviour that was actually wanted, leaving to a wallet or an
    // explorer and coming back to a fresh figure, is refetchOnWindowFocus, and
    // that stays. Returning to the tab still refetches immediately.
    expect(HOOKS).toContain("refetchIntervalInBackground: false");
    expect(HOOKS).toContain("refetchOnWindowFocus: true");
  });
});
