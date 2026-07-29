import localFont from 'next/font/local';
import { useState } from 'react';

import { JsonLd } from '@earn/components/shared/JsonLd';
import { ASSET_URL } from '@earn/constants/ASSET_URL';
import { Meta } from '@earn/layouts/Meta';
import { cn } from '@earn/utils/cn';
import { generateOrganizationSchema } from '@earn/utils/json-ld';

import { CallOut } from '@earn/features/sponsor/components/CallOut';
import { FAQs } from '@earn/features/sponsor/components/FAQs';
import { Footer } from '@earn/features/sponsor/components/Footer';
import { Header } from '@earn/features/sponsor/components/Header';
import { Hero } from '@earn/features/sponsor/components/Hero';
import { HowItWorks } from '@earn/features/sponsor/components/HowItWorks';
import { ListingExamples } from '@earn/features/sponsor/components/ListingExamples';
import { Pricing } from '@earn/features/sponsor/components/Pricing';
import { Stats } from '@earn/features/sponsor/components/Stats';
import { SuperteamNetwork } from '@earn/features/sponsor/components/SuperteamNetwork';
import { Testimonials } from '@earn/features/sponsor/components/Testimonials';
import { TrustedTeams } from '@earn/features/sponsor/components/TrustedTeams';
import { Video } from '@earn/features/sponsor/components/Video';
import { WhyChooseEarn } from '@earn/features/sponsor/components/WhyChooseEarn';

const font = localFont({
  src: '../../../public/OverusedGrotesk-VF.woff2',
  variable: '--font-overused-grotesk',
  preload: false,
});

const VideoPlayback = ({
  setVideoPopup,
}: {
  setVideoPopup: (value: boolean) => void;
}) => {
  return (
    <div
      className="fixed z-50 grid h-screen w-screen place-content-center bg-[rgba(191,203,220,0.67)]"
      onClick={() => setVideoPopup(false)}
    >
      <div className="relative flex w-[95vw] flex-col gap-5 overflow-hidden pt-[56.25%] lg:w-[60vw]">
        <iframe
          width="100%"
          height="100%"
          className="absolute inset-0"
          src="https://www.youtube.com/embed/_OyQ_Bxz1xo?si=U12Uh2foC2Ma914e&autoplay=1&mute=1"
        />
      </div>
    </div>
  );
};

const Sponsor = () => {
  const [videoPopup, setVideoPopup] = useState<boolean>(false);

  return (
    <>
      <Meta
        title="Find Top Talent for Your Crypto Projects on TSION Earn"
        description="Seeking top talent for your crypto project? TSION Earn connects you with experts for Bounties, Projects, and Grants in the crypto space."
        canonical="https://superteam.fun/earn/sponsor/"
        og={ASSET_URL + `/og/sponsor.png`}
      />
      <JsonLd data={[generateOrganizationSchema()]} />

      {videoPopup && <VideoPlayback setVideoPopup={setVideoPopup} />}

      <Header />

      <div
        className={cn(
          'flex flex-col items-center overflow-hidden bg-white',
          font.className,
        )}
      >
        <div className="relative flex w-full flex-col overflow-hidden">
          <Hero />
          <TrustedTeams />
          <WhyChooseEarn />
          <Video showVideo={() => setVideoPopup(true)} />
          <HowItWorks />
          <ListingExamples />
          <Stats />
          <Testimonials />
          <SuperteamNetwork />
          <Pricing />
          <FAQs />
          <CallOut />
          <Footer />
        </div>
      </div>
    </>
  );
};

export default Sponsor;
