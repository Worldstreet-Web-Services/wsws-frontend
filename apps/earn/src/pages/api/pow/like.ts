import type { NextApiResponse } from 'next';

import logger from '@earn/lib/logger';
import { updateLike } from '@earn/services/likeService';
import { safeStringify } from '@earn/utils/safeStringify';

import { type NextApiRequestWithUser } from '@earn/features/auth/types';
import { withAuth } from '@earn/features/auth/utils/withAuth';

async function poWLike(req: NextApiRequestWithUser, res: NextApiResponse) {
  const userId = req.userId;
  const { id } = req.body;
  logger.debug(`Request body: ${safeStringify(req.body)}`);

  try {
    if (!id) {
      logger.warn('PoW ID is missing in the request body');
      return res.status(400).json({
        error: 'PoW ID is required in the request body',
      });
    }

    await updateLike('poW', id, userId!);

    logger.info(`Successfully updated PoW like for id ${id}`);
    return res.status(200).json({
      data: { ok: true },
      message: 'Operation successful',
    });
  } catch (error: any) {
    logger.error(
      `Error updating PoW like for id ${req.body?.id}:`,
      safeStringify(error),
    );
    return res.status(500).json({
      error: error.message,
      message: 'Error occurred while updating PoW like',
    });
  }
}

export default withAuth(poWLike);
