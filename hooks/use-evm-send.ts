"use client";

import { useCallback } from "react";
import { useSocialWallet } from "decane-connect-kit";
import type { EIP1193Provider, SignedAuthorization } from "viem";
import { recordSelfInitiated } from "@/lib/analytics/self-initiated";
import { ensureUnlocked } from "@/lib/decane";
import { sendSponsoredEvmCalls, type SignAuthorization } from "@/lib/trade/sponsor";
import { getSponsoredEvmChainById, hasGasPolicyForChainId } from "@/lib/trade/sponsored-evm";
import type { EvmBatchCall } from "@/lib/migration/types";

export interface EvmSendInput {
  to: `0x${string}`;
  data?: `0x${string}`;
  // Native value to attach, in wei. Sponsorship covers gas only — any value
  // here still comes from the user's own balance.
  value?: bigint;
  chainId: number;
  // Which wallet the caller expects to send from. There is exactly one Decane
  // EVM wallet, so this is a guard against a stale address, not a selector.
  address?: string;
  // Optional gas-limit hint for a non-sponsored provider transaction. The
  // sponsored path ignores it; the bundler estimates its own userOp gas.
  gasLimit?: bigint;
}

type SocialWallet = ReturnType<typeof useSocialWallet>;

// Bridges Decane's 7702 authorization signer to the shape the sponsor flow
// expects. Decane needs the nonce and chain id it is signing for; the sponsor
// flow always supplies them, so absence is a programming error, not a state.
function toSignAuthorization(wallet: SocialWallet): SignAuthorization {
  return async ({ contractAddress, chainId, nonce }) => {
    if (chainId === undefined || nonce === undefined) {
      throw new Error("7702 authorization needs an explicit chainId and nonce.");
    }
    const signed = await wallet.signAuthorization({ contractAddress, chainId, nonce });
    return signed as SignedAuthorization<number>;
  };
}

function connectedEvmAddress(wallet: SocialWallet, expected?: string): `0x${string}` {
  const address = wallet.addresses?.evm;
  if (!address) throw new Error("No EVM wallet is connected.");
  if (expected && expected.toLowerCase() !== address.toLowerCase()) {
    throw new Error("Sends must use your connected embedded wallet.");
  }
  return address as `0x${string}`;
}

// The single EVM send path for the app. Supported sponsored chains route
// through the 7702 + bundler flow; unsupported chains keep the normal EOA send
// path via Decane. The sponsored path already waits for the userOp receipt, so
// callers can treat its returned transaction hash as confirmed.
export function useEvmSend() {
  const wallet = useSocialWallet();

  return useCallback(
    async ({
      to,
      data,
      value,
      chainId,
      address,
      gasLimit,
    }: EvmSendInput): Promise<`0x${string}`> => {
      const from = connectedEvmAddress(wallet, address);
      await ensureUnlocked(wallet);
      // Registry membership alone is not enough: a chain with no Gas Manager
      // policy has its userOp rejected by the bundler, so it takes the ordinary
      // user-paid path instead of failing.
      const sponsored = hasGasPolicyForChainId(chainId) ? getSponsoredEvmChainById(chainId) : null;
      if (sponsored) {
        const accessToken = wallet.getAccessToken();
        if (!accessToken) throw new Error("Your session expired. Sign in again.");
        const provider = wallet.getEthereumProvider({ chainId }) as unknown as EIP1193Provider;
        const sponsoredHash = await sendSponsoredEvmCalls({
          chainId,
          address: from,
          provider,
          signAuthorization: toSignAuthorization(wallet),
          accessToken,
          calls: [{ to, data, value }],
        });
        recordSelfInitiated([sponsoredHash]);
        return sponsoredHash;
      }
      const hash = await wallet.sendTransaction({
        chain: `evm:${chainId}`,
        to,
        data,
        value,
        gasLimit,
      });
      recordSelfInitiated([hash]);
      return hash as `0x${string}`;
    },
    [wallet]
  );
}

// Shared with the migration contract in lib/migration/types, which cannot
// import upward from hooks.
export type { EvmBatchCall } from "@/lib/migration/types";

// Sends several calls as one atomic sponsored operation on a supported EVM
// chain. Used where a flow would otherwise need sequential dependent
// transactions (approve, then consume the allowance): batching removes the
// in-between state and keeps the user to one signature.
export function useEvmSendBatch() {
  const wallet = useSocialWallet();

  return useCallback(
    async (
      calls: EvmBatchCall[],
      chainId: number,
      // The wallet the caller believes it is sending from. A stale address
      // (a migration flow mixing old and new wallets) is refused rather than
      // silently signed by whichever wallet is connected.
      expectedAddress?: string
    ): Promise<`0x${string}`> => {
      if (!hasGasPolicyForChainId(chainId)) {
        throw new Error("Batched transactions are only supported on sponsored EVM chains.");
      }
      if (calls.length === 0) throw new Error("Nothing to send.");
      const from = connectedEvmAddress(wallet, expectedAddress);
      await ensureUnlocked(wallet);
      const accessToken = wallet.getAccessToken();
      if (!accessToken) throw new Error("Your session expired. Sign in again.");
      const provider = wallet.getEthereumProvider({ chainId }) as unknown as EIP1193Provider;
      const hash = await sendSponsoredEvmCalls({
        chainId,
        address: from,
        provider,
        signAuthorization: toSignAuthorization(wallet),
        accessToken,
        calls,
      });
      // Anything this transaction pays back to the wallet, a closed perp's
      // collateral, a game balance being cashed out, a claimed payout, arrives
      // as inbound stablecoin and is indistinguishable from a deposit in
      // activity. It is not one: the user signed for it here.
      recordSelfInitiated([hash]);
      return hash;
    },
    [wallet]
  );
}
