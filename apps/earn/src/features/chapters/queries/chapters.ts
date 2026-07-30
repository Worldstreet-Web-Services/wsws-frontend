import { queryOptions } from '@tanstack/react-query';

import type { ChapterRegionData } from '@earn/interface/chapter';
import { api } from '@earn/lib/api';

const fetchChapters = async () => {
  const response = await api.get<{ chapters: ChapterRegionData[] }>(
    '/api/chapters',
  );
  return response.data.chapters;
};

export const chaptersQuery = queryOptions({
  queryKey: ['chapters'],
  queryFn: fetchChapters,
  staleTime: 5 * 60 * 1000,
  gcTime: 5 * 60 * 1000,
});
