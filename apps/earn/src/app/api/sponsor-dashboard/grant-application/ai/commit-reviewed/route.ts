import { headers } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

import logger from '@earn/lib/logger';
import { prisma } from '@earn/prisma';
import { safeStringify } from '@earn/utils/safeStringify';

import { checkGrantSponsorAuth } from '@earn/features/auth/utils/checkGrantSponsorAuth';
import { getSponsorSession } from '@earn/features/auth/utils/getSponsorSession';
import { type GrantApplicationAi } from '@earn/features/grants/types';
import { formatGrantApplicationAiReviewNotes } from '@earn/features/grants/utils/formatGrantApplicationAiReviewNotes';
import { convertTextToNotesHTML } from '@earn/features/sponsor-dashboard/utils/convertTextToNotesHTML';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id } = body;
  try {
    logger.debug(`Request body: ${safeStringify(body)}`);

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid ID provided',
          message: `Invalid ID provided for generating AI review context for grant with ${id}.`,
        },
        { status: 400 },
      );
    }

    const session = await getSponsorSession(await headers());

    if (session.error || !session.data) {
      return NextResponse.json(
        { error: session.error },
        { status: session.status },
      );
    }
    const { error } = await checkGrantSponsorAuth(
      session.data.userSponsorId,
      id,
    );
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    const unreviewedApplications = await prisma.grantApplication.findMany({
      where: {
        label: {
          in: ['Unreviewed', 'Pending'],
        },
        applicationStatus: 'Pending',
        grantId: id,
      },
      select: {
        ai: true,
        id: true,
        applicationStatus: true,
        label: true,
      },
    });

    const applicationsWithAIReview = unreviewedApplications.filter(
      (u) =>
        !!u.ai &&
        (u.ai as unknown as GrantApplicationAi)?.review?.predictedLabel !==
          'Unreviewed' &&
        (u.ai as unknown as GrantApplicationAi)?.review?.predictedLabel !==
          'Pending',
    );

    const data = await Promise.all(
      applicationsWithAIReview.map(async (appl) => {
        const aiReview = (appl.ai as unknown as GrantApplicationAi)?.review;
        const commitedAi = {
          ...(aiReview ? { review: aiReview } : {}),
          commited: true,
        };
        return await prisma.grantApplication.update({
          where: {
            id: appl.id,
          },
          data: {
            label: aiReview?.predictedLabel,
            notes: convertTextToNotesHTML(
              formatGrantApplicationAiReviewNotes(aiReview),
            ),
            ai: commitedAi,
          },
        });
      }),
    );

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        message: `Error occurred while committing reviewed grant applications.`,
      },
      { status: 500 },
    );
  }
}
