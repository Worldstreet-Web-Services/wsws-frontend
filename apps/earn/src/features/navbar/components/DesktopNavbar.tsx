import { usePrivy } from '@privy-io/react-auth';
import { Gift } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import posthog from 'posthog-js';
import { useEffect, useMemo, useState } from 'react';

import IoSearchOutline from '@earn/components/icons/IoSearchOutline';
import { Button } from '@earn/components/ui/button';
import { ExternalImage } from '@earn/components/ui/cloudinary-image';
import { LocalImage } from '@earn/components/ui/local-image';
import { Separator } from '@earn/components/ui/separator';
import { Skeleton } from '@earn/components/ui/skeleton';
import { useCreditBalance } from '@earn/store/credit';
import { useUser } from '@earn/store/user';
import { cn } from '@earn/utils/cn';

import { CreditIcon } from '@earn/features/credits/icon/credit';
import { HACKATHONS } from '@earn/features/hackathon/constants/hackathons';
import { ProBadge } from '@earn/features/pro/components/ProBadge';

import { LISTING_NAV_ITEMS } from '../constants';
import { LogoContextMenu } from './LogoContextMenu';
import { NavLink } from './NavLink';
import { UserMenu } from './UserMenu';

interface Props {
  onLoginOpen: () => void;
  onSearchOpen: () => void;
  onCreditOpen: () => void;
  onReferralOpen: () => void;
}

export const DesktopNavbar = ({
  onLoginOpen,
  onSearchOpen,
  onCreditOpen,
  onReferralOpen,
}: Props) => {
  const { authenticated, ready } = usePrivy();
  const router = useRouter();

  const { user, isLoading } = useUser();
  const { creditBalance } = useCreditBalance();

  const [authUiReady, setAuthUiReady] = useState(() => ready);
  useEffect(() => {
    if (!ready) {
      setAuthUiReady(false);
      return;
    }
    setAuthUiReady(true);
  }, [ready, authenticated]);

  const isDashboardRoute = useMemo(
    () => router.pathname.startsWith('/earn/dashboard'),
    [router.pathname],
  );
  const isNewTalentRoute = useMemo(
    () => router.pathname.startsWith('/earn/new/talent'),
    [router.pathname],
  );

  const hideSponsorCTA = useMemo(() => {
    if (!isNewTalentRoute) return false;
    try {
      const url = new URL(window.location.origin + router.asPath);
      return url.searchParams.get('referral') === 'true';
    } catch {
      return router.asPath.includes('referral=true');
    }
  }, [isNewTalentRoute, router.asPath]);

  const maxWidth = useMemo(() => {
    if (isDashboardRoute) {
      return 'max-w-full';
    }
    if (isNewTalentRoute) {
      return '2xl:max-w-[82rem]';
    }
    return 'max-w-7xl';
  }, [isDashboardRoute, isNewTalentRoute]);

  const padding = useMemo(() => {
    if (isDashboardRoute) {
      return 'pr-8 pl-6';
    }
    if (isNewTalentRoute) {
      return 'pr-8 pl-24 2xl:pl-0';
    }
    return 'px-2 lg:px-6';
  }, [isDashboardRoute, isNewTalentRoute]);

  const margin = useMemo(() => {
    if (isNewTalentRoute) {
      return 'mx-0 2xl:mx-auto';
    }
    return 'mx-auto';
  }, [isNewTalentRoute]);

  const openCreditDrawer = () => {
    posthog.capture('open_credits');
    onCreditOpen();
  };

  const isPro = user?.isPro;

  return (
    <div
      className={cn(
        'hidden h-14 border-b border-slate-200 bg-white text-slate-500 lg:flex',
        padding,
      )}
    >
      <div
        className={cn(
          'mx-auto flex w-full max-w-7xl justify-between',
          maxWidth,
          margin,
        )}
      >
        <div className="ph-no-capture flex w-fit items-center gap-3 lg:gap-5">
          <LogoContextMenu>
            <Link
              href="/earn"
              className="flex items-center gap-3 hover:no-underline"
              onClick={() => {
                posthog.capture('homepage logo click_universal');
              }}
            >
              <LocalImage
                className="h-10 cursor-pointer object-contain"
                alt="TSION Earn"
                src="/assets/tsion-logo.png"
              />

              {isDashboardRoute && (
                <>
                  <div className="h-6 w-[1.5px] bg-slate-300" />
                  <p className="text-sm tracking-[1.5px]">SPONSORS</p>
                </>
              )}
            </Link>
          </LogoContextMenu>

          <Separator orientation="vertical" className="h-6" />

          {!router.pathname.startsWith('/earn/new/') && (
            <>
              {LISTING_NAV_ITEMS?.map((navItem) => {
                const isCurrent = `${navItem.href}` === router.asPath;
                return (
                  <NavLink
                    isPro={isPro}
                    className="ph-no-capture"
                    onClick={() => {
                      posthog.capture(navItem.posthog);
                    }}
                    key={navItem.label}
                    href={navItem.href ?? '#'}
                    label={navItem.label}
                    isActive={isCurrent}
                  />
                );
              })}

              <NavLink
                isPro={isPro}
                className="ph-no-capture"
                onClick={() => {
                  posthog.capture('pro_navbar');
                }}
                href="/earn/pro"
                label={
                  <ProBadge
                    containerClassName="gap-1 mt-px"
                    iconClassName="size-4 text-zinc-600"
                    textClassName="text-xs font-medium text-slate-600"
                  />
                }
                isActive={router.pathname === '/earn/pro'}
              />

              {HACKATHONS.map((hackathon) => (
                <Link
                  href={`/earn/hackathon/${hackathon.slug}`}
                  key={hackathon.slug}
                  className={cn('flex items-center py-2 font-medium', 'h-11')}
                  prefetch={false}
                >
                  <ExternalImage
                    src={hackathon.logo}
                    alt={hackathon.label}
                    className="h-full object-contain"
                  />
                </Link>
              ))}
            </>
          )}

          {!router.pathname.startsWith('/earn/search') &&
            !router.pathname.startsWith('/earn/new/') && (
              <div
                className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 px-2 py-2 text-slate-500 transition-all duration-100 hover:bg-slate-100 hover:text-slate-700"
                onClick={onSearchOpen}
              >
                <IoSearchOutline className="size-4" />
              </div>
            )}
        </div>

        <div className="flex items-center gap-4 py-1.5">
          {((!authUiReady && !authenticated) || (isLoading && !user)) && (
            <div className="flex items-center gap-2">
              <Skeleton className="size-7 rounded-full" />
              <Skeleton className="mr-4 h-3 w-20" />
            </div>
          )}

          {authUiReady && authenticated && (
            <div className="ph-no-capture flex items-center gap-2">
              {user?.currentSponsorId && !isDashboardRoute && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-semibold"
                  onClick={() => {
                    posthog.capture('sponsor dashboard_navbar');
                  }}
                  asChild
                >
                  <Link href="/earn/dashboard/listings">
                    <span>Dashboard</span>
                    <div className="block h-1.5 w-1.5 rounded-full bg-sky-400" />
                  </Link>
                </Button>
              )}

              {!user?.currentSponsorId && user?.isTalentFilled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'text-brand-grey hover:text-brand-grey bg-indigo-50 text-xs font-semibold hover:bg-indigo-100',
                    isPro &&
                      'bg-zinc-200 text-zinc-700 hover:bg-zinc-300 hover:text-zinc-700',
                  )}
                  onClick={onReferralOpen}
                >
                  <Gift />
                  <span>Get Free Credits</span>
                </Button>
              )}

              {user?.isTalentFilled && (
                <div className="flex items-center gap-1.5">
                  <div
                    className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-2 text-slate-500 transition-all duration-100 hover:bg-slate-100 hover:text-slate-700"
                    onClick={openCreditDrawer}
                  >
                    <CreditIcon
                      className={cn(
                        'size-4',
                        isPro ? 'text-zinc-600' : 'text-brand-grey',
                      )}
                    />
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        isPro ? 'text-zinc-600' : 'text-slate-500',
                      )}
                    >
                      {creditBalance}
                    </p>
                  </div>
                </div>
              )}
              <UserMenu />
            </div>
          )}

          {authUiReady && !authenticated && (
            <div className="ph-no-capture flex items-center gap-2">
              <div className="flex items-center gap-0">
                {!hideSponsorCTA && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs font-semibold"
                    onClick={() => {
                      posthog.capture('create a listing_navbar');
                      router.push('/earn/sponsor');
                    }}
                  >
                    <span>Become a Sponsor</span>
                    <div className="block h-1.5 w-1.5 rounded-full bg-sky-400" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-semibold"
                  onClick={() => {
                    posthog.capture('login_navbar');
                    onLoginOpen();
                  }}
                >
                  Login
                </Button>
              </div>
              <Button
                variant="default"
                size="sm"
                className="my-1 w-full px-4 text-xs font-semibold"
                onClick={() => {
                  posthog.capture('signup_navbar');
                  onLoginOpen();
                }}
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
