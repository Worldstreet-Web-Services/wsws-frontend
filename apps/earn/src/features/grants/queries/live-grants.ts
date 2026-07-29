import { queryOptions } from '@tanstack/react-query';

import { api } from '@earn/lib/api';

import { type GrantWithApplicationCount } from '@earn/features/grants/types';

interface GetGrantsParams {
  take?: number;
  excludeIds?: string[];
}

const fetchLiveGrants = async (
  params: GetGrantsParams = {},
): Promise<GrantWithApplicationCount[]> => {
  const { data } = await api.get('/api/grants/live', { params });
  return data;
};

export const liveGrantsQuery = (params: GetGrantsParams) =>
  queryOptions({
    queryKey: ['live-grants', params],
    queryFn: () => fetchLiveGrants(params),
  });
