import { queryOptions } from '@tanstack/react-query';

import { type BountyTemplateWithSponsor } from '@earn/app/api/sponsor-dashboard/templates/route';
import { api } from '@earn/lib/api';
import { type BountyType } from '@earn/prisma/enums';

const fetchListingTemplates = async (type: BountyType) => {
  if (type === 'hackathon') return [];

  const { data } = await api.get<BountyTemplateWithSponsor[]>(
    '/api/sponsor-dashboard/templates/',
    {
      params: { type },
    },
  );
  return data;
};

export const listingTemplatesQuery = (type: BountyType) =>
  queryOptions({
    queryKey: ['listingTemplates', type],
    enabled: type !== 'hackathon',
    queryFn: () => fetchListingTemplates(type),
  });
