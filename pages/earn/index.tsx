import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import { type GetServerSideProps } from 'next';
import dynamic from 'next/dynamic';

import { JsonLd } from '@earn/components/shared/JsonLd';
import { useBreakpoint } from '@earn/hooks/use-breakpoint';
import { Default } from '@earn/layouts/Default';
import { Meta } from '@earn/layouts/Meta';
import { useUser } from '@earn/store/user';
import { cn } from '@earn/utils/cn';
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
} from '@earn/utils/json-ld';
import { getURL } from '@earn/utils/validUrl';

import { ProListingsAnnouncement } from '@earn/features/announcements/components/ProListingsAnnouncement';
import { BannerCarousel } from '@earn/features/home/components/Banner';
import { SponsorStageBanner } from '@earn/features/home/components/SponsorStage/SponsorStageBanner';
import { UserStatsBanner } from '@earn/features/home/components/UserStatsBanner';
import { userCountQuery } from '@earn/features/home/queries/user-count';
import { ListingsSection } from '@earn/features/listings/components/ListingsSection';

const GrantsSection = dynamic(() =>
  import('@earn/features/grants/components/GrantsSection').then(
    (mod) => mod.GrantsSection,
  ),
);

const HomeSideBar = dynamic(() =>
  import('@earn/features/home/components/SideBar').then((mod) => mod.HomeSideBar),
);

const HomepagePop = dynamic(
  () =>
    import('@earn/features/conversion-popups/components/HomepagePop').then(
      (mod) => mod.HomepagePop,
    ),
  { ssr: false },
);

interface HomePageProps {
  readonly potentialSession: boolean;
  readonly totalUsers: number;
  readonly totalSponsors: number;
}

export default function HomePage({
  potentialSession,
  totalUsers,
  totalSponsors,
}: HomePageProps) {
  const { authenticated, ready } = usePrivy();
  useQuery({ ...userCountQuery, initialData: { totalUsers } });
  const { user } = useUser();
  const isLg = useBreakpoint('lg');
  const hasPotentialSession = ready ? authenticated : potentialSession;
  const canonicalUrl = `${getURL()}earn/`;

  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebSiteSchema();

  return (
    <Default
      className="bg-white"
      meta={
        <>
          <Meta
            title="TSION Earn | Crypto Bounties, Web3 Jobs & TSION Opportunities | Work to Earn in Crypto"
            description="Find crypto bounties, web3 jobs, and TSION opportunities. Earn crypto by completing bounties in design, development, and content. The leading platform for remote crypto work."
            canonical={canonicalUrl}
          />
          <JsonLd data={[organizationSchema, websiteSchema]} />
        </>
      }
    >
      <div className={cn('mx-auto w-full px-2 lg:px-6')}>
        <div className="mx-auto w-full max-w-7xl p-0">
          <div className="flex items-start justify-between">
            <div className="w-full lg:border-r lg:border-slate-100">
              <div className="w-full lg:pr-6">
                <div className="pt-3">
                  {hasPotentialSession ? (
                    <>
                      {!!user?.currentSponsorId && isLg ? (
                        <div className="mt-3">
                          <SponsorStageBanner />
                        </div>
                      ) : (
                        <UserStatsBanner />
                      )}
                    </>
                  ) : (
                    <BannerCarousel
                      totalUsers={totalUsers}
                      totalSponsors={totalSponsors}
                    />
                  )}
                </div>
                <div className="w-full">
                  <ListingsSection
                    type="home"
                    potentialSession={hasPotentialSession}
                  />
                  {/* <HackathonSection type="home" /> */}
                  <GrantsSection type="home" />
                </div>
              </div>
            </div>
            {isLg && (
              <div className="flex">
                <HomeSideBar type="landing" />
              </div>
            )}
          </div>
        </div>
      </div>
      <HomepagePop />
      <ProListingsAnnouncement />
    </Default>
  );
}

export const getServerSideProps: GetServerSideProps<HomePageProps> = async ({
  req,
}) => {
  const cookies = req.headers.cookie || '';

  const cookieExists = /(^|;)\s*user-id-hint=/.test(cookies);

  return {
    props: {
      potentialSession: cookieExists,
      totalUsers: 12000,
      totalSponsors: 100,
    },
  };
};
