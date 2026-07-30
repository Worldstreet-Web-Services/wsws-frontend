import type { GetServerSidePropsContext } from 'next';

import { JsonLd } from '@earn/components/shared/JsonLd';
import { countries } from '@earn/constants/country';
import { type ChapterDisplay } from '@earn/interface/chapter';
import { Home } from '@earn/layouts/Home';
import { Meta } from '@earn/layouts/Meta';
import { resolveChapterBySlug } from '@earn/lib/earn-public-data';
import {
  generateBreadcrumbListSchema,
  generateRegionalOrganizationSchema,
} from '@earn/utils/json-ld';
import { getURL } from '@earn/utils/validUrl';

import { RegionPop } from '@earn/features/conversion-popups/components/RegionPop';
import { GrantsSection } from '@earn/features/grants/components/GrantsSection';
import { ListingsSection } from '@earn/features/listings/components/ListingsSection';

interface RegionsPageProps {
  readonly slug: string;
  readonly st?: ChapterDisplay;
  readonly countryData?: {
    readonly name: string;
    readonly code: string;
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const RegionsPage = ({ slug, st, countryData }: RegionsPageProps) => {
  if (st) {
    const displayName = st.displayValue;

    const ogImage = new URL(`${getURL()}api/dynamic-og/region/`);
    ogImage.searchParams.set('region', st.displayValue);
    ogImage.searchParams.set('code', st.code!);

    const organizationSchema = generateRegionalOrganizationSchema(st);
    const breadcrumbSchema = generateBreadcrumbListSchema([
      { name: 'Home', url: '/' },
      { name: displayName || st.region },
    ]);

    return (
      <Home
        type="region"
        st={st}
        meta={
          <>
            <Meta
              title={`Welcome to TSION Earn ${displayName} | Discover Bounties and Grants`}
              description={`Welcome to TSION Earn ${displayName}'s page — Discover bounties and grants and become a part of the global crypto community`}
              canonical={`https://superteam.fun/earn/regions/${slug}/`}
              og={ogImage.toString()}
            />
            <JsonLd data={[organizationSchema, breadcrumbSchema]} />
          </>
        }
      >
        <div className="w-full">
          <RegionPop st={st} />
          <ListingsSection type="region" region={st.region} />

          <GrantsSection type="region" region={st.region} />
        </div>
      </Home>
    );
  }

  if (countryData) {
    const countryName = countryData.name;
    const countryCode = countryData.code.toUpperCase();

    const ogImage = new URL(`${getURL()}api/dynamic-og/region/`);
    ogImage.searchParams.set('region', countryName);
    ogImage.searchParams.set('code', countryCode);

    const organizationSchema = generateRegionalOrganizationSchema({
      displayValue: countryName,
      region: countryName,
      slug,
      code: countryCode,
    });

    const breadcrumbSchema = generateBreadcrumbListSchema([
      { name: 'Home', url: '/' },
      { name: countryName },
    ]);

    return (
      <Home
        type="region"
        countryData={countryData}
        meta={
          <>
            <Meta
              title={`Welcome to TSION Earn ${countryName} | Discover Bounties and Grants`}
              description={`Welcome to TSION Earn ${countryName}'s page — Discover bounties and grants and become a part of the global crypto community`}
              canonical={`https://superteam.fun/earn/regions/${slug}/`}
              og={ogImage.toString()}
            />
            <JsonLd data={[organizationSchema, breadcrumbSchema]} />
          </>
        }
      >
        <div className="w-full">
          <ListingsSection type="region" region={countryName} />

          <GrantsSection type="region" region={countryName} />
        </div>
      </Home>
    );
  }

  return null;
};

export async function getServerSideProps(
  context: GetServerSidePropsContext,
) {
  const { slug } = context.query;
  const slugString = (slug as string)?.toLowerCase() || '';

  const st = await resolveChapterBySlug(slugString);

  if (st) {
    return {
      props: { slug, st },
    };
  }

  const country = countries.find((item) => slugify(item.name) === slugString);

  if (country) {
    return {
      props: {
        slug,
        countryData: {
          name: country.name,
          code: country.code,
        },
      },
    };
  }

  return { notFound: true };
}

export default RegionsPage;
