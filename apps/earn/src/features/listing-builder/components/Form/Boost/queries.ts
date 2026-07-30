import { queryOptions } from '@tanstack/react-query';

import { loadTokenList } from '@earn/constants/tokenList';
import { fetchEarnJson } from '@earn/lib/earn-fetch';

import { fetchTokenUSDValue } from '@earn/features/wallet/utils/fetchTokenUSDValue';

import { isSkillsSelected } from './constants';

export const tokenUsdValueQuery = (tokenSymbol?: string | null) => {
  return queryOptions({
    queryKey: ['boost.tokenUsdValue', tokenSymbol],
    queryFn: async (): Promise<number> => {
      if (!tokenSymbol) throw new Error('No token symbol');
      const tokens = await loadTokenList();
      const mintAddress = tokens.find(
        (token) => token.tokenSymbol === tokenSymbol,
      )?.mintAddress;
      if (!mintAddress) throw new Error('No mint address');
      return await fetchTokenUSDValue(mintAddress);
    },
    enabled: Boolean(tokenSymbol),
    staleTime: 1000 * 60 * 5,
  });
};

export const featuredAvailabilityQuery = () =>
  queryOptions({
    queryKey: ['boost.featuredAvailability'],
    queryFn: async (): Promise<{
      readonly isAvailable: boolean;
      readonly count?: number;
    }> => {
      const data = await fetchEarnJson<{ count?: number }>(
        '/api/sponsor-dashboard/listing/featured-posts',
        {
          method: 'POST',
        },
      );
      const isAvailable =
        typeof data.count === 'number' ? data.count < 2 : true;
      return { isAvailable, count: data.count };
    },
    staleTime: 1000 * 60,
  });

export const emailEstimateQuery = (skills: unknown, region?: string | null) => {
  const enabled = isSkillsSelected(skills);
  return queryOptions({
    queryKey: ['boost.emailEstimate', { skills, region }],
    queryFn: async (): Promise<number> => {
      const data = await fetchEarnJson<{ count?: number }>(
        '/api/sponsor-dashboard/listing/email-estimate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skills, region }),
        },
      );
      return typeof data.count === 'number' ? data.count : 0;
    },
    enabled,
    staleTime: 1000 * 60 * 10,
  });
};
