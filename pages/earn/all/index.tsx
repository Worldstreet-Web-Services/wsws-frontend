import { type GetServerSideProps } from 'next';

import { ASSET_URL } from '@earn/constants/ASSET_URL';
import { Home } from '@earn/layouts/Home';
import { Meta } from '@earn/layouts/Meta';

import { HomepagePop } from '@earn/features/conversion-popups/components/HomepagePop';
import { ListingsSection } from '@earn/features/listings/components/ListingsSection';

interface HomePageProps {
  potentialSession: boolean;
}

export default function AllListingsPage({ potentialSession }: HomePageProps) {
  return (
    <Home
      type="listing"
      meta={
        <Meta
          title="All Crypto Opportunities | Web3 Bounties & Jobs | TSION Earn"
          description="Browse all crypto bounties, web3 jobs, and TSION opportunities. Find remote work in blockchain development, design, content, and more. Earn cryptocurrency for your skills."
          canonical="https://superteam.fun/earn/all/"
          og={ASSET_URL + `/og/og.png`}
        />
      }
    >
      <HomepagePop />
      <div className="w-full">
        <ListingsSection type="all" potentialSession={potentialSession} />
      </div>
    </Home>
  );
}

export const getServerSideProps: GetServerSideProps<HomePageProps> = async ({
  req,
}) => {
  const cookies = req.headers.cookie || '';

  const cookieExists = /(^|;)\s*user-id-hint=/.test(cookies);

  return { props: { potentialSession: cookieExists } };
};
