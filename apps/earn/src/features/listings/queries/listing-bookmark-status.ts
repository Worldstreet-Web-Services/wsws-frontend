import { queryOptions } from '@tanstack/react-query';

import { api } from '@earn/lib/api';
import type { SubscribeBountyModel as BookmarkBountyModel } from '@earn/prisma/models/SubscribeBounty';
import type { UserModel } from '@earn/prisma/models/User';

type ListingBookmark = BookmarkBountyModel & { User: UserModel | null };

const fetchBookmarks = async (id: string): Promise<ListingBookmark[]> => {
  const { data } = await api.get('/api/listings/bookmark/status', {
    params: { listingId: id },
  });
  return data;
};

export const listingBookmarksQuery = (id: string) =>
  queryOptions({
    queryKey: ['bookmarks', id],
    queryFn: () => fetchBookmarks(id),
  });
