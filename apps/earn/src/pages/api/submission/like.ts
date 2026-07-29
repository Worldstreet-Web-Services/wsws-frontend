import type { NextApiResponse } from 'next';

import logger from '@earn/lib/logger';
import { updateLike } from '@earn/services/likeService';
import { safeStringify } from '@earn/utils/safeStringify';

import { type NextApiRequestWithUser } from '@earn/features/auth/types';
import { withAuth } from '@earn/features/auth/utils/withAuth';

async function submission(req: NextApiRequestWithUser, res: NextApiResponse) {
  try {
    const userId = req.userId;
    const { id }: { id: string } = req.body;
    logger.debug(`Request body: ${safeStringify(req.body)}`);

    if (!id) {
      return res.status(400).json({
        message: 'Submission ID is required.',
      });
    }

    await updateLike('submission', id, userId!);

    return res.status(200).json({
      data: { ok: true },
      message: 'Operation successful',
    });
  } catch (error: any) {
    logger.error(
      `Error updating submission like for user=${req.userId}: ${error.message}`,
    );
    return res.status(500).json({
      error: error.message,
      message: 'Error occurred while updating submission like.',
    });
  }
}

export default withAuth(submission);
