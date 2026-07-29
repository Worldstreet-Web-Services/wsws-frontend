import { type SponsorType } from '@earn/interface/sponsor';

type SponsorRegionInput = Pick<SponsorType, 'chapter'> | null | undefined;

export const getOfficialSuperteamRegion = (
  sponsor: SponsorRegionInput,
): string | null => {
  if (!sponsor?.chapter?.region) {
    return null;
  }

  return sponsor.chapter.region;
};
