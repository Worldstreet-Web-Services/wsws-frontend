import { z } from 'zod';

import { type PrismaUserWithoutKYC } from '@earn/interface/user';
import { type GrantApplicationModel } from '@earn/prisma/models/GrantApplication';
import { type GrantTrancheModel } from '@earn/prisma/models/GrantTranche';

export type ScoutRowType = {
  id: string;
  name: string;
  pfp: string | null;
  username: string | null;
  dollarsEarned: number;
  score: number;
  skills: string[];
  recommended: boolean;
  invited: boolean;
  userId: string;
};

type UserWithChapter = PrismaUserWithoutKYC & {
  peopleId?: string | null;
  people?: {
    id: string;
    chapterId?: string | null;
    type?: string | null;
    chapter?: {
      id: string;
      name: string;
      icons?: string | null;
    } | null;
  } | null;
};

export interface GrantApplicationWithUser extends GrantApplicationModel {
  user: UserWithChapter;
  totalEarnings?: number;
  GrantTranche?: GrantTrancheModel[];
}

export interface SponsorStats {
  name?: string;
  slug?: string;
  logo?: string;
  yearOnPlatform?: number;
  totalRewardAmount?: number;
  totalListingsAndGrants?: number;
  totalSubmissionsAndApplications?: number;
  totalHackathonTracks?: number;
  totalHackathonSubmissions?: number;
  totalHackathonRewards?: number;
}

const PAYMENT_LINK_REGEX = /^https?:\/\/\S+$/i;

export const verifyPaymentsSchema = z.object({
  paymentLinks: z
    .array(
      z
        .object({
          submissionId: z.string(),
          link: z.string().optional(),
          isVerified: z.boolean(),
        })
        .refine(
          (data) => {
            if (data.isVerified) return true;
            return !data.link || PAYMENT_LINK_REGEX.test(data.link);
          },
          {
            message: 'Please add a valid payment link',
            path: ['link'],
          },
        )
        .transform((data) => ({
          ...data,
          txId: data.isVerified ? '' : data.link?.trim() || '',
        })),
    )
    .refine((links) => links.some((link) => link.link || link.isVerified), {
      message: 'Please add atleast one valid payment link',
    }),
});

export type VerifyPaymentsFormData = z.infer<typeof verifyPaymentsSchema>;

export type ValidatePaymentResult = {
  submissionId: string;
  txId: string;
  status: 'SUCCESS' | 'FAIL' | 'ALREADY_VERIFIED';
  message?: string;
  actualAmount?: number;
};
