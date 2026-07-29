import type { ChapterRegionData } from '@earn/interface/chapter';

import {
  filterRegionCountry,
  getCombinedRegion,
  getParentRegions,
} from '@earn/features/listings/utils/region';

export function getUserRegion(
  userLocation?: string | null,
  chapters: ChapterRegionData[] = [],
): string[] | null {
  if (!userLocation) return null;

  const matchedRegion = getCombinedRegion(userLocation, true, chapters);

  if (matchedRegion?.name) {
    return [
      matchedRegion.name,
      'Global',
      ...(filterRegionCountry(matchedRegion, userLocation).country || []),
      ...(getParentRegions(matchedRegion) || []),
    ];
  } else {
    return ['Global'];
  }
}
