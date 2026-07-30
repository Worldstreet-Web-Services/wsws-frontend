import { type NextRequest, NextResponse } from 'next/server';

import logger from '@earn/lib/logger';
import { prisma } from '@earn/prisma';
import { safeStringify } from '@earn/utils/safeStringify';

export async function GET(_request: NextRequest) {
  try {
    const submissions = await prisma.submission.findMany({
      where: { isArchived: false, isActive: true },
      take: 5,
      select: {
        createdAt: true,
        isWinner: true,
        listing: { select: { type: true, isWinnersAnnounced: true } },
        user: { select: { firstName: true, lastName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(submissions, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    logger.warn(`Error`, safeStringify(error));
    return NextResponse.json(
      { error: 'Error occurred while fetching feed data.' },
      { status: 500 },
    );
  }
}
