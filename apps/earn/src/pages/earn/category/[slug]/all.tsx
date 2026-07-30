import type { NextPageContext } from 'next';
import Head from 'next/head';

import { JsonLd } from '@earn/components/shared/JsonLd';
import { Home } from '@earn/layouts/Home';
import { Meta } from '@earn/layouts/Meta';
import {
  generateBreadcrumbListSchema,
  generateCategoryCollectionSchema,
} from '@earn/utils/json-ld';
import { getURL } from '@earn/utils/validUrl';

import { ListingsSection } from '@earn/features/listings/components/ListingsSection';
import { findCategoryBySlug } from '@earn/features/listings/utils/category';

interface AllCategoryPageProps {
  readonly slug: string;
  readonly categoryName: string;
  readonly categoryDescription: string;
}

export default function AllCategoryPage({
  slug,
  categoryName,
  categoryDescription,
}: AllCategoryPageProps) {
  const ogImage = new URL(`${getURL()}api/dynamic-og/category/`);
  ogImage.searchParams.set('category', categoryName);

  const description = `Explore all ${categoryName.toLowerCase()} opportunities on TSION Earn. ${categoryDescription}`;

  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: 'Home', url: '/' },
    { name: categoryName },
  ]);

  const categoryCollectionSchema = generateCategoryCollectionSchema(
    categoryName,
    slug,
    description,
  );

  return (
    <Home
      type="category-all"
      categoryData={{
        name: categoryName,
        slug,
      }}
      meta={
        <>
          <Meta
            title={`All ${categoryName} Opportunities | TSION Earn`}
            description={description}
            canonical={`https://superteam.fun/earn/category/${slug}/all/`}
            og={ogImage.toString()}
          />
          <Head>
            <meta property="og:type" content="website" />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta
              property="og:image:alt"
              content={`All ${categoryName} Opportunities on TSION Earn`}
            />
            <meta name="twitter:card" content="summary_large_image" />
          </Head>
          <JsonLd data={[breadcrumbSchema, categoryCollectionSchema]} />
        </>
      }
    >
      <div className="w-full">
        <ListingsSection type="category-all" category={categoryName} />
      </div>
    </Home>
  );
}

export async function getServerSideProps(context: NextPageContext) {
  const { slug } = context.query;
  const slugString = (slug as string)?.toLowerCase() || '';

  const categoryInfo = findCategoryBySlug(slugString);

  if (!categoryInfo) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      slug: categoryInfo.slug,
      categoryName: categoryInfo.name,
      categoryDescription: categoryInfo.description,
    },
  };
}
