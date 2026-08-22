import { encodeFunctionData, erc20Abi, isAddress, type Address, type Hex } from "viem";

import type { MarketAssetFirmQuote } from "@/lib/api/schemas/rwas";
import { toBaseUnits } from "@/lib/trade/math";
import { USDC_BY_CHAIN } from "@/lib/trade/usdc";

export const ETHEREUM_CHAIN_ID = 1;
export const ETHEREUM_NETWORK = "eth-mainnet";
export const BASE_NETWORK = "base-mainnet";
export const ONDO_LIMIT_ORDER_ADDRESS = "0xf0Bc39Fc911F6437C84d16188dD8294F7110f451" as Address;
export const ETHEREUM_USDC_ADDRESS = USDC_BY_CHAIN.ethereum.address as Address;
export const BASE_USDC_ADDRESS = USDC_BY_CHAIN.base.address as Address;
export const USDC_DECIMALS = USDC_BY_CHAIN.ethereum.decimals;
export const ORDER_EXPIRY_MS = 180_000;

const PRICE_DECIMALS = 18;
const PRICE_SCALE = 10n ** BigInt(PRICE_DECIMALS);

const LIMIT_ORDER_ABI = [
  {
    type: "function",
    name: "createBuyOrderExactIn",
    stateMutability: "nonpayable",
    inputs: [
      { name: "gmToken", type: "address" },
      { name: "quoteToken", type: "address" },
      { name: "quoteAmount", type: "uint256" },
      { name: "limitPrice", type: "uint256" },
      { name: "expiry", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "createSellOrderExactIn",
    stateMutability: "nonpayable",
    inputs: [
      { name: "gmToken", type: "address" },
      { name: "quoteToken", type: "address" },
      { name: "gmAmount", type: "uint256" },
      { name: "limitPrice", type: "uint256" },
      { name: "expiry", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export interface OndoOrderCall {
  to: Address;
  data: Hex;
}

function positiveUnits(value: string, decimals: number, label: string): bigint {
  const units = toBaseUnits(value, decimals);
  if (units <= 0n) throw new Error(`${label} must be greater than zero.`);
  return units;
}

export function effectiveLimitPrice(
  side: "buy" | "sell",
  quote: Pick<MarketAssetFirmQuote, "price" | "volatilityAllowance">
): bigint {
  const price = positiveUnits(quote.price, PRICE_DECIMALS, "Quote price");
  const allowance = toBaseUnits(quote.volatilityAllowance, PRICE_DECIMALS);
  const adjustment = (price * allowance) / PRICE_SCALE;
  if (side === "sell" && adjustment >= price) throw new Error("The sell limit price is invalid.");
  return side === "buy" ? price + adjustment : price - adjustment;
}

export function buildOndoOrderCalls(input: {
  side: "buy" | "sell";
  assetAddress: string;
  inputAmount: bigint;
  quote: MarketAssetFirmQuote;
  now?: number;
}): OndoOrderCall[] {
  if (!isAddress(input.assetAddress)) throw new Error("The Ethereum asset address is invalid.");
  if (input.quote.assetAddress.toLowerCase() !== input.assetAddress.toLowerCase()) {
    throw new Error("The executable quote does not match the selected asset.");
  }
  if (input.inputAmount <= 0n) throw new Error("The order amount must be greater than zero.");
  const now = input.now ?? Date.now();
  if (Date.parse(input.quote.expiresAt) <= now) {
    throw new Error("The executable quote expired. Request a new quote.");
  }

  const assetAddress = input.assetAddress as Address;
  const approvalToken = input.side === "buy" ? ETHEREUM_USDC_ADDRESS : assetAddress;
  const limitPrice = effectiveLimitPrice(input.side, input.quote);
  const expiry = BigInt(Math.floor((now + ORDER_EXPIRY_MS) / 1_000));
  const orderData =
    input.side === "buy"
      ? encodeFunctionData({
          abi: LIMIT_ORDER_ABI,
          functionName: "createBuyOrderExactIn",
          args: [assetAddress, ETHEREUM_USDC_ADDRESS, input.inputAmount, limitPrice, expiry],
        })
      : encodeFunctionData({
          abi: LIMIT_ORDER_ABI,
          functionName: "createSellOrderExactIn",
          args: [assetAddress, ETHEREUM_USDC_ADDRESS, input.inputAmount, limitPrice, expiry],
        });

  return [
    {
      to: approvalToken,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [ONDO_LIMIT_ORDER_ADDRESS, input.inputAmount],
      }),
    },
    { to: ONDO_LIMIT_ORDER_ADDRESS, data: orderData },
  ];
}

export function confirmedBridgeSpend(input: {
  startingBalance: bigint;
  currentBalance: bigint;
  requestedAmount: bigint;
  expectedAmount: bigint;
}): bigint {
  const delivered = input.currentBalance - input.startingBalance;
  if (delivered <= 0n) return 0n;
  const expected = input.expectedAmount > 0n ? input.expectedAmount : input.requestedAmount;
  return [delivered, expected, input.requestedAmount].reduce((smallest, value) =>
    value < smallest ? value : smallest
  );
}
