"use client";

import { createClient, http, type EIP1193Provider, type SignedAuthorization } from "viem";
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import { getEntryPoint, KERNEL_7702_DELEGATION_ADDRESS, KERNEL_V3_3 } from "@zerodev/sdk/constants";
import { getSponsoredEvmChainById } from "@/lib/trade/sponsored-evm";
import { isReceiptChain, publicClientForChain } from "@/lib/trade/receipt";

const ENTRY_POINT = getEntryPoint("0.7");

// Every sponsored EVM transaction routes through our authenticated proxy so
// the ZeroDev project URL never reaches the client.
const BUNDLER_PATH = "/api/zerodev-bundler";

export interface SponsoredCall {
  to: `0x${string}`;
  data?: `0x${string}`;
  value?: bigint;
}

export type SignAuthorization = (input: {
  contractAddress: `0x${string}`;
  chainId?: number;
  nonce?: number;
}) => Promise<SignedAuthorization<number>>;

// A minimal "can serve node reads" shape — satisfied by both the ZeroDev-backed
// read client and the bundler-proxy client. Typed as a bare
// callable so viem's method-union request signatures on either client widen to
// it; `params` is passed through untouched to the JSON-RPC layer.
type ReadRequest = (args: { method: string; params: unknown }) => Promise<unknown>;

async function isAlreadyDelegated(request: ReadRequest, address: `0x${string}`): Promise<boolean> {
  const code = (await request({
    method: "eth_getCode",
    params: [address, "latest"],
  })) as string;
  return code.toLowerCase() === `0xef0100${KERNEL_7702_DELEGATION_ADDRESS.slice(2).toLowerCase()}`;
}

// Sends a sponsored EVM transaction from the user's embedded EOA, upgraded in
// place via EIP-7702. The EOA signs the one-time delegation if needed, then
// the userOp, and the configured ZeroDev sponsorship path covers the gas cost.
export async function sendSponsoredEvmCalls({
  chainId,
  address,
  provider,
  signAuthorization,
  accessToken,
  calls,
}: {
  chainId: number;
  address: `0x${string}`;
  provider: EIP1193Provider;
  signAuthorization: SignAuthorization;
  accessToken: string;
  calls: SponsoredCall[];
}): Promise<`0x${string}`> {
  const target = getSponsoredEvmChainById(chainId);
  if (!target || !target.gasPolicy) {
    throw new Error(`This chain is not configured for sponsored EVM sends (${chainId}).`);
  }

  // Bundler transport: ONLY the ERC-4337 UserOperation methods
  // (eth_sendUserOperation, eth_estimateUserOperationGas, …) go here, through
  // our ZeroDev proxy.
  const transport = http(`${BUNDLER_PATH}/${target.network}`, {
    fetchOptions: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  // Read client: ALL plain node reads (eth_getCode, eth_getTransactionCount, gas
  // reads) go to a real node RPC, NOT the Alchemy bundler endpoint. The bundler
  // endpoint is tuned for UserOperation methods; general state reads through it
  // are slow and intermittently time out — the `eth_getCode` the account builder
  // and delegation check issue on EVERY send was hanging there, which is what
  // failed createMarket (once per outcome in a multi-market event). This client
  // is what `to7702SimpleSmartAccount` and the bundler client use for reads;
  // only `sendUserOperation` uses the bundler transport. Chains without a
  // dedicated read node fall back to the bundler transport.
  const client = isReceiptChain(target.chainId)
    ? publicClientForChain(target.chainId)
    : createClient({ chain: target.chain, transport });

  const read: ReadRequest = (args) =>
    (client.request as (a: { method: string; params: unknown }) => Promise<unknown>)(args);

  let authorization: SignedAuthorization<number> | undefined;
  if (!(await isAlreadyDelegated(read, address))) {
    const nonce = Number(
      (await read({
        method: "eth_getTransactionCount",
        params: [address, "latest"],
      })) as string
    );
    authorization = await signAuthorization({
      contractAddress: KERNEL_7702_DELEGATION_ADDRESS,
      chainId: target.chainId,
      nonce,
    });
  }

  const account = await createKernelAccount(client, {
    address,
    eip7702Account: provider,
    eip7702Auth: authorization,
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_V3_3,
  });

  const paymasterClient = createZeroDevPaymasterClient({
    chain: target.chain,
    transport,
  });

  // UltraRelay combines the bundler and paymaster and applies the gas policy
  // enabled for this project in the ZeroDev dashboard. Other supported chains
  // retain ZeroDev's explicit paymaster RPC path.
  const sponsorship =
    target.zeroDevProvider === "ULTRA_RELAY"
      ? {
          userOperation: {
            estimateFeesPerGas: async () => ({
              maxFeePerGas: 0n,
              maxPriorityFeePerGas: 0n,
            }),
          },
        }
      : {
          paymaster: {
            getPaymasterStubData: (
              userOperation: Parameters<
                typeof paymasterClient.sponsorUserOperation
              >[0]["userOperation"]
            ) => paymasterClient.sponsorUserOperation({ userOperation, shouldConsume: false }),
            getPaymasterData: (
              userOperation: Parameters<
                typeof paymasterClient.sponsorUserOperation
              >[0]["userOperation"]
            ) => paymasterClient.sponsorUserOperation({ userOperation, shouldConsume: true }),
          },
        };

  const bundlerClient = createKernelAccountClient({
    account,
    client,
    chain: target.chain,
    bundlerTransport: transport,
    ...sponsorship,
  });

  const hash = await bundlerClient.sendUserOperation({ calls, authorization });

  const receipt = await bundlerClient.waitForUserOperationReceipt({ hash });
  return receipt.receipt.transactionHash;
}
