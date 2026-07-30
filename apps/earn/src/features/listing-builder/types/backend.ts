import { type BountyType, type CompensationType } from '@earn/prisma/enums';

export interface TTitleGenerateResponse {
  title: string;
}

export interface TTokenGenerateResponse {
  token?: string | null;
}

export interface TRewardsGenerateResponse {
  compensationType: CompensationType;
  maxBonusSpots?: number | null;
  maxRewardAsk: number;
  minRewardAsk: number;
  rewards: Record<string, number>;
}

export interface BountyTemplateWithSponsor {
  id: string;
  title: string;
  description: string | null;
  skills: string[] | null;
  rewards: Record<string, number> | null;
  rewardAmount: number | null;
  minRewardAsk: number | null;
  maxRewardAsk: number | null;
  maxBonusSpots: number | null;
  emoji: string | null;
  compensationType: CompensationType | null;
  type: BountyType;
  token: string | null;
  color: string | null;
  language: string | null;
  region: string | null;
  slug: string;
  Bounties: Array<{
    sponsor: {
      logo: string | null;
      name: string;
    };
  }>;
}
