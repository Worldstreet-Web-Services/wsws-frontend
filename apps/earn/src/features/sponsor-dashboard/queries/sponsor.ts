import { queryOptions } from '@tanstack/react-query';

import { type SponsorType } from '@earn/interface/sponsor';
import { api } from '@earn/lib/api';

const fetchSponsorData = async (): Promise<SponsorType> => {
  const { data } = await api.get('/api/sponsors/');
  return data;
};

export const sponsorQuery = (currentSponsorId: string | undefined) =>
  queryOptions({
    queryKey: ['sponsorData', currentSponsorId],
    queryFn: fetchSponsorData,
    enabled: !!currentSponsorId,
  });
