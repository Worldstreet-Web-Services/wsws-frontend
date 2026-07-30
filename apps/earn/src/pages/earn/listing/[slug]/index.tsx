import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import type { GetServerSideProps } from 'next';
import dynamic from 'next/dynamic';
import Head from 'next/head';

import { JsonLd } from '@earn/components/shared/JsonLd';
import { ExternalImage } from '@earn/components/ui/cloudinary-image';
import { ListingPageLayout } from '@earn/layouts/Listing';
import { getSubmissionCount } from '@earn/pages/api/listings/[listingId]/submission-count';
import { getWinningSubmissionsByListingId } from '@earn/pages/api/listings/[listingId]/winners';
import { getListingDetailsBySlug } from '@earn/pages/api/listings/details/[slug]';
import {
  generateBreadcrumbListSchema,
  generateJobPostingSchema,
} from '@earn/utils/json-ld';

import { ListingPop } from '@earn/features/conversion-popups/components/ListingPop';
import { DescriptionUI } from '@earn/features/listings/components/ListingPage/DescriptionUI';
import { listingWinnersQuery } from '@earn/features/listings/queries/listing-winners';
import { submissionCountQuery } from '@earn/features/listings/queries/submission-count';
import { type Listing } from '@earn/features/listings/types';

const ListingWinners = dynamic(
  () =>
    import('@earn/features/listings/components/ListingPage/ListingWinners').then(
      (m) => m.ListingWinners,
    ),
  { ssr: false },
);

interface ListingDetailsProps {
  listing: Listing | null;
  dehydratedState: DehydratedState;
}

function ListingDetails({
  listing: initialListing,
  dehydratedState,
}: ListingDetailsProps) {
  const jobPostingSchema = initialListing
    ? generateJobPostingSchema(initialListing)
    : null;

  const breadcrumbSchema = initialListing
    ? generateBreadcrumbListSchema([
        { name: 'Home', url: '/' },
        {
          name: initialListing.type === 'bounty' ? 'Bounties' : 'Jobs',
          url: '/earn/all',
        },
        { name: initialListing.title || 'Listing' },
      ])
    : null;

  return (
    <>
      <HydrationBoundary state={dehydratedState}>
        {initialListing?.isPrivate && (
          <Head>
            <meta name="robots" content="noindex, nofollow" />
            <meta name="googlebot" content="noindex, nofollow" />
          </Head>
        )}
        {jobPostingSchema && breadcrumbSchema && (
          <JsonLd data={[jobPostingSchema, breadcrumbSchema]} />
        )}
        <ListingPageLayout listing={initialListing}>
          <ListingPop listing={initialListing} />
          {initialListing?.isWinnersAnnounced && (
            <div className="mt-6 hidden w-full md:block">
              <ListingWinners bounty={initialListing} />
            </div>
          )}
          {initialListing?.Hackathon?.slug === 'redacted' && (
            <ExternalImage
              src="/hackathon/redacted/redacted-listing-banner"
              alt="Redacted Listing Banner"
              className="mt-4"
            />
          )}
          <DescriptionUI
            description={initialListing?.description}
            isPro={
              (initialListing?.isPro ?? false) &&
              !(initialListing?.isWinnersAnnounced ?? false)
            }
            type={initialListing?.type ?? 'bounty'}
            sponsorId={initialListing?.sponsorId ?? ''}
          />
        </ListingPageLayout>
      </HydrationBoundary>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.query;
  let listingData;
  try {
    listingData = await getListingDetailsBySlug(String(slug));
  } catch (e) {
    console.error(e);
    listingData = null;
  }
  const queryClient = new QueryClient();
  if (listingData?.id) {
    const prefetchPromises: Promise<void>[] = [
      queryClient.prefetchQuery({
        ...submissionCountQuery(listingData.id),
        queryFn: () => getSubmissionCount(listingData.id),
      }),
    ];

    if (listingData.isWinnersAnnounced) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          ...listingWinnersQuery(listingData.id),
          queryFn: () => getWinningSubmissionsByListingId(listingData.id),
        }),
      );
    }

    await Promise.all(prefetchPromises);
  }
  return {
    props: {
      listing: listingData,
      dehydratedState: dehydrate(queryClient),
    },
  };
};
export default ListingDetails;
