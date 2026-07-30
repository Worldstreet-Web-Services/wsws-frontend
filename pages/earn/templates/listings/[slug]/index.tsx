import type { GetServerSideProps } from 'next';

import { ListingPageLayout } from '@earn/layouts/Listing';
import { fetchEarnServerJson } from '@earn/lib/earn-fetch';

import { DescriptionUI } from '@earn/features/listings/components/ListingPage/DescriptionUI';
import { ListingWinners } from '@earn/features/listings/components/ListingPage/ListingWinners';
import { type Listing } from '@earn/features/listings/types';

interface BountyDetailsProps {
  bounty: Listing | null;
}

function BountyDetails({ bounty }: BountyDetailsProps) {
  return (
    <ListingPageLayout isTemplate listing={bounty}>
      {bounty?.isWinnersAnnounced && (
        <div className="mt-6 hidden w-full md:block">
          <ListingWinners bounty={bounty} />
        </div>
      )}
      <DescriptionUI
        description={bounty?.description}
        isPro={bounty?.isPro ?? false}
        type={bounty?.type ?? 'bounty'}
        sponsorId={bounty?.sponsorId ?? ''}
      />
    </ListingPageLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.query;

  let bountyData;
  try {
    bountyData = await fetchEarnServerJson<Listing | null>(
      `/api/sponsor-dashboard/templates/${String(slug)}`,
    );
  } catch (e) {
    console.error(JSON.stringify(e, null, 2));
    bountyData = null;
  }

  return {
    props: {
      bounty: bountyData,
    },
  };
};

export default BountyDetails;
