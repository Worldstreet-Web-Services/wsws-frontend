import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import logger from '@earn/lib/logger';
import { prisma } from '@earn/prisma';
import { safeStringify } from '@earn/utils/safeStringify';

import { validateListingSponsorAuth } from '@earn/features/auth/utils/checkListingSponsorAuth';
import { validateSession } from '@earn/features/auth/utils/getSponsorSession';
import { buildListingContext } from '@earn/features/listing-builder/utils/contextBuilder';
import { validateUpdatePermissions } from '@earn/features/listing-builder/utils/isListingEditAllowed';
import { transformToPrismaData } from '@earn/features/listing-builder/utils/listingTransformationPipe';
import { validateListing } from '@earn/features/listing-builder/utils/listingValidator';
import { handlePostSaveOperations } from '@earn/features/listing-builder/utils/postListingSaveOperation';
import { handleWinnerResets } from '@earn/features/listing-builder/utils/winnerResets';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const id = params.id;
  try {
    const sessionResult = await validateSession(await headers());
    if ('error' in sessionResult) {
      return sessionResult.error;
    }
    const { userId, userSponsorId } = sessionResult.session;

    const listingAuthResult = await validateListingSponsorAuth(
      userSponsorId,
      id,
    );
    if ('error' in listingAuthResult) {
      return listingAuthResult.error;
    }
    const listing = listingAuthResult.listing;

    logger.debug(`Request params: ${safeStringify(params)}`);
    const data = await request.json();
    logger.debug(`Request body: ${safeStringify(data)}`);

    const { hackathon, sponsor, user } = await buildListingContext({
      listing,
      userId,
      hackathonId: data.hackathonId,
    });

    const updateNotAllowed = validateUpdatePermissions(listing, user);
    if (updateNotAllowed) {
      return updateNotAllowed;
    }

    const validatedData = await validateListing({
      listing,
      sponsor,
      user,
      hackathon,
      isEditing: true,
      formData: data,
    });

    const dataToUpdate = await transformToPrismaData({
      validatedListing: validatedData,
      listing,
      sponsor,
      isEditing: true,
    });
    logger.debug(`Updating listing with data: ${safeStringify(dataToUpdate)}`, {
      id,
    });

    // we want reset right before update
    await handleWinnerResets({
      listingId: id,
      validatedListing: validatedData,
    });

    await prisma.bounties.update({
      where: { id: id as string },
      data: dataToUpdate,
    });
    logger.debug(`Update Listing Successful`, { id });

    const result = await prisma.bounties.findUniqueOrThrow({
      where: { id: id as string },
      include: {
        sponsor: true,
      },
    });

    await handlePostSaveOperations({
      result,
      originalListing: listing,
      userId,
      isEditing: true,
      isVerifying: listing.status === 'VERIFYING',
    });

    logger.info(`Listing Updation API Fully Successful with ID: ${id}`);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.log('error', JSON.stringify(error));
    logger.error(
      `Error occurred while updating listing with id = ${id}: ${safeStringify(error)}`,
    );
    return NextResponse.json(
      {
        error: error.message,
        message: `Error occurred while updating listing with id = ${id}.`,
      },
      { status: 500 },
    );
  }
}
