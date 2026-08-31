"use client";

import { createServiceClient } from "@/lib/api/service";

const arkjet = createServiceClient("/api/arkjet", "Arkjet is unavailable right now.");

export type ArkjetRoundStatus = "COMMITTED" | "LOCKED" | "RUNNING" | "REVEALED" | "CANCELLED";
export type ArkjetCrashReason = "RANDOM" | "LIQUIDITY";

export interface ArkjetRound {
  roundId: string;
  sequence: number;
  status: ArkjetRoundStatus;
  algorithmVersion: string;
  serverSeedCommitment: string;
  currentMultiplier: string | null;
  crashMultiplier?: string | null;
  randomCrashMultiplier?: string | null;
  liquidityCapMultiplier?: string | null;
  crashReason?: ArkjetCrashReason | null;
  liquiditySnapshotCommitment?: string | null;
  committedAt: string;
  bettingClosesAt: string;
  lockedAt: string | null;
  runningAt: string | null;
  crashAt?: string;
  revealedAt: string | null;
  cancellationReason: string | null;
}

export interface ArkjetRoundHistory {
  items: ArkjetRound[];
  nextBeforeSequence: number | null;
}

export interface ArkjetCapabilities {
  fairnessEnabled: boolean;
  roundEngineEnabled: boolean;
  wageringEnabled: boolean;
  settlementEnabled: boolean;
  riskModelVersion: string;
  algorithmVersions: string[];
}

export interface ArkjetRiskRules {
  modelVersion: string;
  currency: string;
  currencyDecimalPlaces: number;
  minimumBet: string;
  minimumBetMinor: number;
  minimumCashoutMultiplier: string;
  maximumCashoutMultiplier: string;
}

export interface ArkjetFairnessRules {
  algorithmVersion: string;
  rtpBasisPoints: number;
  rtpPercent: string;
  formula: string;
  formulaOutput: string;
  playedCrashFormula: string;
  liquidityModelVersion: string;
  liquidityProof: {
    requiredForAlgorithm: string;
    hashAlgorithm: string;
    domainSeparator: string;
    commitmentTiming: string;
    canonicalEncoding: string;
  };
  commitment: {
    hashAlgorithm: string;
    serverSeedBits: number;
    domainSeparator: string;
    bindsRoundId: boolean;
  };
  result: {
    hashAlgorithm: string;
    entropyBits: number;
    domainSeparator: string;
    cashoutWinningCondition: string;
    minimumCashoutMultiplier: string;
    lowResultDistribution: string;
  };
  rounding: {
    policy: string;
    decimalPlaces: number;
    minimumMultiplier: string;
  };
  clientSeedSelection: {
    requiredSeeds: number;
    seedBits: number;
    playerSelection: string;
    fallbackDerivation: string;
    fallbackDomainSeparator: string;
  };
}

export type ArkjetBetStatus = "ACCEPTED" | "CASHED_OUT" | "LOST" | "CANCELLED";

export interface ArkjetBet {
  betId: string;
  roundId: string;
  panelId: "A" | "B";
  currency: string;
  amount: string;
  maximumCashoutMultiplier: string;
  automaticCashoutMultiplier: string | null;
  maximumPayout: string;
  reservedNetLiability: string;
  status: ArkjetBetStatus;
  cashoutMultiplier: string | null;
  payout: string | null;
  idempotencyKey: string;
  acceptedAt: string;
  settledAt: string | null;
}

export interface ArkjetBetList {
  items: ArkjetBet[];
}

export interface ArkjetBalance {
  playerId: string;
  currency: string;
  available: string;
  locked: string;
  pendingWithdrawal: string;
  total: string;
}

export interface ArkjetFundingConfig {
  chainId: number;
  tokenSymbol: string;
  tokenAddress: string;
  tokenDecimals: number;
  depositAddress: string;
  requiredConfirmations: number;
  currency: string;
  currencyDecimalPlaces: number;
  ngnMinorPerUsdc: string;
  withdrawalFeeBps: number;
  withdrawalsEnabled: boolean;
  simulatedWithdrawals: boolean;
}

export interface ArkjetDeposit {
  depositId: string;
  txHash: string;
  amountUsdc: string;
  creditedAmount: string;
  currency: string;
  status: string;
  creditedAt: string;
}

export interface ArkjetWithdrawal {
  withdrawalId: string;
  toAddress: string;
  amount: string;
  fee: string;
  amountUsdc: string;
  currency: string;
  status: string;
  txHash: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface CreateArkjetBetInput {
  roundId: string;
  panelId: "A" | "B";
  amount: string;
  currency: string;
  clientSeed?: string;
  autoCashoutMultiplier?: string;
  idempotencyKey: string;
}

export interface ArkjetChatMessage {
  id: string;
  authorName: string;
  avatarSeed: string;
  text: string;
  createdAt: string;
  likeCount: number;
  viewerLiked: boolean;
  isOwn: boolean;
}

export interface ArkjetChatFeed {
  items: ArkjetChatMessage[];
  onlineCount: number;
}

export interface ArkjetLikeResult {
  messageId: string;
  liked: boolean;
  likeCount: number;
}

export function fetchArkjetCurrentRound(): Promise<ArkjetRound> {
  return arkjet.get<ArkjetRound>("/rounds/current");
}

export function fetchArkjetRoundHistory(limit = 18): Promise<ArkjetRoundHistory> {
  return arkjet.get<ArkjetRoundHistory>("/rounds/history", { limit });
}

export function fetchArkjetCapabilities(): Promise<ArkjetCapabilities> {
  return arkjet.get<ArkjetCapabilities>("/capabilities");
}

export function fetchArkjetFairnessRules(): Promise<ArkjetFairnessRules> {
  return arkjet.get<ArkjetFairnessRules>("/fairness/rules");
}

export function fetchArkjetRiskRules(): Promise<ArkjetRiskRules> {
  return arkjet.get<ArkjetRiskRules>("/risk/rules");
}

export function fetchArkjetBalance(): Promise<ArkjetBalance> {
  return arkjet.authedGet<ArkjetBalance>("/bets/balance");
}

export function fetchArkjetFundingConfig(): Promise<ArkjetFundingConfig> {
  return arkjet.get<ArkjetFundingConfig>("/funding/config");
}

export function confirmArkjetDeposit(txHash: string): Promise<ArkjetDeposit> {
  return arkjet.post<ArkjetDeposit>("/funding/deposits/confirm", { txHash });
}

export function createArkjetWithdrawal(
  amount: string,
  idempotencyKey: string
): Promise<ArkjetWithdrawal> {
  return arkjet.post<ArkjetWithdrawal>("/funding/withdrawals", { amount, idempotencyKey });
}

export function fetchArkjetCurrentBets(): Promise<ArkjetBetList> {
  return arkjet.authedGet<ArkjetBetList>("/bets/current");
}

export function fetchArkjetBetHistory(limit = 50): Promise<ArkjetBetList> {
  return arkjet.authedGet<ArkjetBetList>("/bets/history", { limit });
}

export function createArkjetBet(input: CreateArkjetBetInput): Promise<ArkjetBet> {
  return arkjet.post<ArkjetBet>("/bets", input);
}

export function cancelArkjetBet(betId: string): Promise<ArkjetBet> {
  return arkjet.del<ArkjetBet>(`/bets/${encodeURIComponent(betId)}`);
}

export function cashoutArkjetBet(betId: string): Promise<ArkjetBet> {
  return arkjet.post<ArkjetBet>(`/bets/${encodeURIComponent(betId)}/cashout`);
}

export function fetchArkjetChat(): Promise<ArkjetChatFeed> {
  return arkjet.authedGet<ArkjetChatFeed>("/chat", { limit: 40 });
}

export function postArkjetMessage(text: string): Promise<ArkjetChatMessage> {
  return arkjet.post<ArkjetChatMessage>("/chat/messages", { text });
}

export function setArkjetMessageLike(messageId: string, liked: boolean): Promise<ArkjetLikeResult> {
  const path = `/chat/messages/${encodeURIComponent(messageId)}/like`;
  return liked ? arkjet.put<ArkjetLikeResult>(path) : arkjet.del<ArkjetLikeResult>(path);
}

export function refreshArkjetPresence(): Promise<{ onlineCount: number }> {
  return arkjet.post<{ onlineCount: number }>("/chat/presence");
}
