import { type GetServerSideProps } from 'next';

import { JsonLd } from '@earn/components/shared/JsonLd';
import { ASSET_URL } from '@earn/constants/ASSET_URL';
import { Home } from '@earn/layouts/Home';
import { Meta } from '@earn/layouts/Meta';
import { generateBreadcrumbListSchema } from '@earn/utils/json-ld';

import { HomepagePop } from '@earn/features/conversion-popups/components/HomepagePop';
import { ListingsSection } from '@earn/features/listings/components/ListingsSection';

interface JobsPageProps {
  readonly potentialSession: boolean;
}

export default function JobsPage({ potentialSession }: JobsPageProps) {
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: 'Home', url: '/' },
    { name: 'Crypto Jobs', url: '/earn/jobs' },
  ]);

  return (
    <Home
      type="listing"
      listingType="projects"
      meta={
        <>
          <Meta
            title="Crypto Jobs & Web3 Careers | TSION Jobs | TSION Earn"
            description="Find remote crypto jobs, web3 careers, and TSION opportunities. Browse bounties, freelance projects, and full-time positions in blockchain, DeFi, NFTs, and more. Earn crypto for your skills."
            canonical="https://superteam.fun/earn/jobs/"
            og={ASSET_URL + `/og/og.png`}
          />
          <JsonLd data={[breadcrumbSchema]} />
        </>
      }
    >
      <HomepagePop />

      <div className="w-full">
        <ListingsSection
          type="all"
          potentialSession={potentialSession}
          defaultTab="projects"
        />
      </div>
    </Home>
  );
}

export const getServerSideProps: GetServerSideProps<JobsPageProps> = async ({
  req,
}) => {
  const cookies = req.headers.cookie || '';
  const cookieExists = /(^|;)\s*user-id-hint=/.test(cookies);

  return { props: { potentialSession: cookieExists } };
};
