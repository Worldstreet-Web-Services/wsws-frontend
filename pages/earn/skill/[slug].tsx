import { type GetServerSideProps } from 'next';
import Head from 'next/head';

import { JsonLd } from '@earn/components/shared/JsonLd';
import { Home } from '@earn/layouts/Home';
import { Meta } from '@earn/layouts/Meta';
import {
  generateBreadcrumbListSchema,
  generateSkillCollectionSchema,
} from '@earn/utils/json-ld';
import { getURL } from '@earn/utils/validUrl';

import { GrantsSection } from '@earn/features/grants/components/GrantsSection';
import { ListingsSection } from '@earn/features/listings/components/ListingsSection';
import { findSkillBySlug } from '@earn/features/listings/utils/skill';

interface SkillPageProps {
  readonly slug: string;
  readonly skillName: string;
  readonly skillType: 'parent' | 'subskill';
  readonly parentSkill: string | null;
}

const SkillPage = ({
  slug,
  skillName,
  skillType,
  parentSkill,
}: SkillPageProps) => {
  const ogImage = new URL(`${getURL()}api/dynamic-og/skill/`);
  ogImage.searchParams.set('skill', skillName);
  ogImage.searchParams.set('type', skillType);

  const description =
    skillType === 'parent'
      ? `Explore ${skillName} opportunities on TSION Earn. Find bounties and projects that match your ${skillName.toLowerCase()} skills and start earning in crypto.`
      : `Discover ${skillName} opportunities on TSION Earn. Find specialized bounties and projects that require ${skillName.toLowerCase()} expertise.`;

  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: 'Home', url: '/' },
    { name: skillName },
  ]);

  const skillCollectionSchema = generateSkillCollectionSchema(
    skillName,
    slug,
    description,
  );

  return (
    <Home
      type="skill"
      skillData={{
        name: skillName,
        type: skillType,
        parent: parentSkill || undefined,
      }}
      meta={
        <>
          <Meta
            title={`${skillName} Opportunities | TSION Earn`}
            description={description}
            canonical={`https://superteam.fun/earn/skill/${slug}/`}
            og={ogImage.toString()}
          />
          <Head>
            <meta property="og:type" content="website" />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta
              property="og:image:alt"
              content={`${skillName} Opportunities on TSION Earn`}
            />
            <meta name="twitter:card" content="summary_large_image" />
          </Head>
          <JsonLd data={[breadcrumbSchema, skillCollectionSchema]} />
        </>
      }
    >
      <div className="w-full">
        <ListingsSection type="skill" skill={slug} />
        <GrantsSection hideWhenEmpty type="skill" skill={slug} />
      </div>
    </Home>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { params } = context;

  const slug = params?.slug;

  if (typeof slug !== 'string') {
    return {
      notFound: true,
    };
  }

  const skillInfo = findSkillBySlug(slug);

  if (!skillInfo) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      slug,
      skillName: skillInfo.name,
      skillType: skillInfo.type,
      parentSkill: skillInfo.type === 'subskill' ? skillInfo.parent : null,
    },
  };
};

export default SkillPage;
