import { type ChapterDisplay } from '@earn/interface/chapter';

import { fetchEarnServerJson } from './earn-fetch';

type ChapterListItem = {
  name: string;
  region: string;
  displayValue: string;
  slug: string;
  code: string;
  country: string[];
  icons?: string;
  banner?: string;
  link?: string;
  hello?: string;
  nationality?: string;
};

type ChaptersPayload = {
  chapters: ChapterListItem[];
};

type PublicHackathonStats = {
  deadline: string | null;
  startDate: string | null;
  announceDate: string | null;
};

type PublicUserPreview = {
  firstName: string | null;
  lastName: string | null;
  username: string;
  photo: string | null;
};

type UserSearchPayload = {
  users: PublicUserPreview[];
};

function normalizeChapter(chapter: ChapterListItem): ChapterDisplay {
  return {
    name: chapter.name,
    icons: chapter.icons || '',
    banner: chapter.banner || '',
    region: chapter.region,
    displayValue: chapter.displayValue || chapter.region,
    country: Array.isArray(chapter.country) ? chapter.country : [],
    code: chapter.code || '',
    hello: chapter.hello || '',
    nationality: chapter.nationality || '',
    slug: chapter.slug,
    link: chapter.link || '',
  };
}

export async function fetchActiveChapters(): Promise<ChapterDisplay[]> {
  const { chapters } =
    await fetchEarnServerJson<ChaptersPayload>('/api/chapters');
  return chapters.map(normalizeChapter);
}

export async function resolveChapterBySlug(
  slug: string,
): Promise<ChapterDisplay | null> {
  const chapters = await fetchActiveChapters();
  return (
    chapters.find((chapter) => chapter.slug.toLowerCase() === slug.toLowerCase()) ||
    null
  );
}

export async function fetchHackathonPublicStats(
  slug: string,
): Promise<PublicHackathonStats> {
  const params = new URLSearchParams({ slug });
  return fetchEarnServerJson<PublicHackathonStats>(
    `/api/hackathon/public-stats?${params.toString()}`,
  );
}

export async function fetchUserPreviewByUsername(
  username: string,
): Promise<PublicUserPreview | null> {
  const params = new URLSearchParams({ query: username });
  const { users } = await fetchEarnServerJson<UserSearchPayload>(
    `/api/user/search?${params.toString()}`,
  );

  return (
    users.find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    ) || null
  );
}
