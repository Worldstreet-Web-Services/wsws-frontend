import { queryOptions } from '@tanstack/react-query';

import { api } from '@earn/lib/api';

import { type SponsorStageResponse } from '@earn/features/home/types/sponsor-stage';

const fetchSponsorStage = async (): Promise<SponsorStageResponse> => {
  const { data } = await api.get('/api/homepage/sponsor-stage');
  return data;
};

export const sponsorStageQuery = queryOptions({
  queryKey: ['sponsor-stage'],
  queryFn: fetchSponsorStage,
  staleTime: 1000 * 60 * 5,
  gcTime: 1000 * 60 * 10,
});
