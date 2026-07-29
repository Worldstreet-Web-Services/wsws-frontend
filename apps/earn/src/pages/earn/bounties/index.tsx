import { type GetServerSideProps } from 'next';

import { JsonLd } from '@earn/components/shared/JsonLd';
import { ASSET_URL } from '@earn/constants/ASSET_URL';
import { Home } from '@earn/layouts/Home';
import { Meta } from '@earn/layouts/Meta';
import { generateBreadcrumbListSchema } from '@earn/utils/json-ld';

import { ListingsSection } from '@earn/features/listings/components/ListingsSection';

interface BountiesPageProps {
  readonly potentialSession: boolean;
}

export default function BountiesPage({ potentialSession }: BountiesPageProps) {
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: 'Home', url: '/' },
    { name: 'Crypto Bounties' },
  ]);

  return (
    <Home
      type="listing"
      listingType="bounties"
      meta={
        <>
          <Meta
            title="Crypto Bounties | Web3 Bounties | TSION Bounties | TSION Earn"
            description="Earn crypto by completing bounties. Find web3 bounties, TSION bounties, and crypto tasks in development, design, and content. Get paid in USDC for your skills."
            canonical="https://superteam.fun/earn/bounties/"
            og={ASSET_URL + `/og/og.png`}
          />
          <JsonLd data={[breadcrumbSchema]} />
        </>
      }
    >
      <div className="w-full">
        <ListingsSection
          type="all"
          potentialSession={potentialSession}
          defaultTab="bounties"
        />
      </div>
    </Home>
  );
}

export const getServerSideProps: GetServerSideProps<
  BountiesPageProps
> = async ({ req }) => {
  const cookies = req.headers.cookie || '';
  const cookieExists = /(^|;)\s*user-id-hint=/.test(cookies);

  return { props: { potentialSession: cookieExists } };
};
