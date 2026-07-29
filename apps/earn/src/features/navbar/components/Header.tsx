import { usePrivy } from '@privy-io/react-auth';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { useEffect } from 'react';

import { useDisclosure } from '@earn/hooks/use-disclosure';

const Login = dynamic(
  () => import('@earn/features/auth/components/Login').then((mod) => mod.Login),
  { ssr: false },
);
const CreditDrawer = dynamic(
  () =>
    import('@earn/features/credits/components/CreditDrawer').then(
      (mod) => mod.CreditDrawer,
    ),
  { ssr: false },
);
const ReferralModal = dynamic(
  () =>
    import('@earn/features/credits/components/ReferralModal').then(
      (mod) => mod.ReferralModal,
    ),
  { ssr: false },
);

const SearchModal = dynamic(() =>
  import('@earn/features/search/components/SearchModal').then(
    (mod) => mod.SearchModal,
  ),
);
const BottomBar = dynamic(() =>
  import('./BottomBar').then((mod) => mod.BottomBar),
);
const BountySnackbar = dynamic(() =>
  import('./BountySnackbar').then((mod) => mod.BountySnackbar),
);
const GrantSnackbar = dynamic(() =>
  import('./GrantSnackbar').then((mod) => mod.GrantSnackbar),
);
const SponsorStageSnackbar = dynamic(() =>
  import('@earn/features/home/components/SponsorStage/SponsorStageSnackbar').then(
    (mod) => mod.SponsorStageSnackbar,
  ),
);
const DesktopNavbar = dynamic(() =>
  import('./DesktopNavbar').then((mod) => mod.DesktopNavbar),
);
const MobileNavbar = dynamic(() =>
  import('./MobileNavbar').then((mod) => mod.MobileNavbar),
);

export const Header = () => {
  const { authenticated, ready } = usePrivy();
  const searchParams = useSearchParams();

  const {
    isOpen: isLoginOpen,
    onOpen: onLoginOpen,
    onClose: onLoginClose,
  } = useDisclosure();

  const {
    isOpen: isSearchOpen,
    onOpen: onSearchOpen,
    onClose: onSearchClose,
  } = useDisclosure();

  const {
    isOpen: isCreditOpen,
    onOpen: onCreditOpen,
    onClose: onCreditClose,
  } = useDisclosure();

  const {
    isOpen: isReferralOpen,
    onOpen: onReferralOpen,
    onClose: onReferralClose,
  } = useDisclosure();

  function searchOpenWithEvent() {
    posthog.capture('initiate_search');
    onSearchOpen();
  }

  const openCreditWithEvent = () => {
    posthog.capture('open_credits');
    onCreditOpen();
  };

  const openReferralWithEvent = () => {
    posthog.capture('open_referrals');
    onReferralOpen();
  };

  useEffect(() => {
    const checkHashAndOpenModal = () => {
      const hashHasEmail = window.location.hash === '#emailPreferences';
      const hashHasDispute =
        window.location.hash.startsWith('#dispute-submission-') || false;
      const hasLoginParam = searchParams?.get('login') !== null;

      if (
        (hashHasEmail || hashHasDispute || hasLoginParam) &&
        ready &&
        !authenticated
      ) {
        onLoginOpen();
      }
    };

    checkHashAndOpenModal();
  }, [isLoginOpen, onLoginOpen, ready, authenticated, searchParams]);

  useEffect(() => {
    const checkHashAndOpenModal = () => {
      const url = window.location.href;
      const hashIndex = url.indexOf('#');
      const afterHash = hashIndex !== -1 ? url.substring(hashIndex + 1) : '';
      const [hashValue] = afterHash.split('?');
      const hashHasDispute =
        hashValue?.startsWith('dispute-submission-') || false;

      if (hashHasDispute && authenticated) {
        openCreditWithEvent();
      }
    };

    checkHashAndOpenModal();
  }, [authenticated, onCreditOpen]);

  return (
    <>
      <Login isOpen={isLoginOpen} onClose={onLoginClose} onOpen={onLoginOpen} />
      <BountySnackbar />
      <GrantSnackbar />
      <div className="sticky top-0 z-40">
        <DesktopNavbar
          onLoginOpen={onLoginOpen}
          onSearchOpen={searchOpenWithEvent}
          onCreditOpen={openCreditWithEvent}
          onReferralOpen={openReferralWithEvent}
        />
        <SponsorStageSnackbar />
      </div>
      <MobileNavbar
        onLoginOpen={onLoginOpen}
        onCreditOpen={openCreditWithEvent}
        onReferralOpen={openReferralWithEvent}
      />
      <SearchModal isOpen={isSearchOpen} onClose={onSearchClose} />
      <div className="fixed bottom-0 z-60 w-full">
        <BottomBar onSearchOpen={searchOpenWithEvent} />
      </div>
      <ReferralModal isOpen={isReferralOpen} onClose={onReferralClose} />
      <CreditDrawer isOpen={isCreditOpen} onClose={onCreditClose} />
    </>
  );
};
