import { franc } from 'franc';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import logger from '@earn/lib/logger';
import { prisma } from '@earn/prisma';
import { type InputJsonValue } from '@earn/prisma/internal/prismaNamespace';
import { type BountiesUncheckedCreateInput } from '@earn/prisma/models/Bounties';
import { canonicalizeRegionValue } from '@earn/utils/canonicalRegion';
import { cleanSkills } from '@earn/utils/cleanSkills';
import { safeStringify } from '@earn/utils/safeStringify';

import {
  type ListingWithSponsor,
  validateListingSponsorAuth,
} from '@earn/features/auth/utils/checkListingSponsorAuth';
import { validateSession } from '@earn/features/auth/utils/getSponsorSession';
import type { ListingFormData } from '@earn/features/listing-builder/types';
import { getValidSlug } from '@earn/features/listing-builder/utils/getValidSlug';
import { validateDraftPermissions } from '@earn/features/listing-builder/utils/isListingDraftable';
import {
  getValidListingRegion,
  isChapterSponsorEditingRegionToGlobal,
} from '@earn/features/listing-builder/utils/validateListingRegion';

async function transformToPrismaData(
  formData: Partial<ListingFormData>,
  userId: string,
  userSponsorId: string,
  existingListing?: ListingWithSponsor,
): Promise<BountiesUncheckedCreateInput> {
  const {
    title,
    slug,
    deadline,
    commitmentDate,
    templateId,
    pocSocials,
    description,
    type,
    region,
    eligibility,
    rewardAmount,
    rewards,
    maxBonusSpots,
    token,
    compensationType,
    minRewardAsk,
    maxRewardAsk,
    isPrivate,
    skills,
    isFndnPaying,
    hackathonId,
    referredBy,
  } = formData as Partial<ListingFormData>;

  const processedTitle = title || 'Untitled Draft';
  const language = description ? franc(description) : 'eng';
  const cleanedSkills = skills ? cleanSkills(skills) : undefined;

  const uniqueSlug = await getValidSlug({
    id: formData.id || undefined,
    title: processedTitle,
    slug,
    listing: existingListing || undefined,
  });

  return {
    title: processedTitle,
    slug: uniqueSlug,
    description,
    deadline: deadline ? new Date(deadline) : undefined,
    commitmentDate: commitmentDate ? new Date(commitmentDate) : undefined,
    pocSocials,
    templateId,
    type,
    region: region ? canonicalizeRegionValue(region) : undefined,
    eligibility: eligibility as InputJsonValue,
    rewardAmount,
    rewards: rewards as InputJsonValue,
    maxBonusSpots: maxBonusSpots === undefined ? undefined : maxBonusSpots || 0,
    token,
    compensationType,
    minRewardAsk,
    maxRewardAsk,
    isPrivate,
    skills: cleanedSkills as InputJsonValue,
    language,
    sponsorId: userSponsorId,
    isFndnPaying,
    hackathonId,
    referredBy,
    pocId: existingListing?.pocId || userId,
  };
}

async function saveListing(
  listingId: string | undefined,
  data: BountiesUncheckedCreateInput,
) {
  return listingId
    ? await prisma.bounties.update({ where: { id: listingId }, data })
    : await prisma.bounties.create({ data });
}

export async function POST(request: Request) {
  try {
    const sessionResult = await validateSession(await headers());
    if ('error' in sessionResult) {
      return sessionResult.error;
    }
    const { userId, userSponsorId } = sessionResult.session;

    let body: Partial<ListingFormData>;
    try {
      body = await request.json();
    } catch (jsonError) {
      const rawText = await request.text();
      logger.debug('Request body raw:', rawText);
      logger.error('Failed to parse JSON request body', {
        error: jsonError,
      });
      return NextResponse.json(
        {
          error: 'Invalid JSON in request body',
          message:
            jsonError instanceof Error
              ? jsonError.message
              : 'Unknown JSON parsing error',
        },
        { status: 400 },
      );
    }
    logger.debug(`Request body: ${safeStringify(body)}`);

    if (body.region) {
      const validRegion = await getValidListingRegion(body.region);
      if (!validRegion) {
        return NextResponse.json(
          { error: 'Invalid region selected' },
          { status: 400 },
        );
      }
      body.region = validRegion;
    }

    let listing: ListingWithSponsor | undefined;
    if (body.id) {
      const result = await validateListingSponsorAuth(userSponsorId, body.id);
      if ('error' in result) {
        return result.error;
      }
      listing = result.listing;
    }

    if (
      listing &&
      body.region &&
      isChapterSponsorEditingRegionToGlobal({
        currentRegion: listing.region,
        nextRegion: body.region,
        hasChapter: !!listing.sponsor.chapter,
      })
    ) {
      return NextResponse.json(
        { error: 'Chapter sponsors cannot edit a listing region to Global' },
        { status: 400 },
      );
    }

    const isDraftNotAllowed = validateDraftPermissions(listing);
    if (isDraftNotAllowed) {
      return isDraftNotAllowed;
    }

    const prismaData = await transformToPrismaData(
      body,
      userId,
      userSponsorId,
      listing,
    );

    const result = await saveListing(body.id || undefined, prismaData);
    logger.debug(`Draft saved successfully: ${result.id}`);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.log('error', error);
    logger.error('Error saving draft:', error);
    return NextResponse.json(
      { error: 'Failed to save draft' },
      { status: 500 },
    );
  }
}
