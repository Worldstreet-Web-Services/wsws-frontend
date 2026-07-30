import type { NextApiRequest, NextApiResponse } from 'next';

import { getTokenList, searchTokenList } from '@earn/server/tokenList';
import { setCacheHeaders } from '@earn/utils/cacheControl';

const handleError = (error: unknown, res: NextApiResponse) => {
  console.error('Failed to load token metadata', error);
  return res.status(500).json({ error: 'Failed to load token metadata' });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    setCacheHeaders(res, {
      noStore: true,
    });

    if (req.method === 'GET') {
      const query =
        typeof req.query.query === 'string' ? req.query.query.trim() : '';

      if (query) {
        const tokens = await searchTokenList(query);
        return res.status(200).json({ tokens, registryTokens: [] });
      }

      const tokens = await getTokenList();
      return res.status(200).json({ tokens, registryTokens: [] });
    }

    if (req.method === 'POST') {
      return res
        .status(410)
        .json({ error: 'External token registry is not available' });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return handleError(error, res);
  }
}
