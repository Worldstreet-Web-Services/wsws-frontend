"use client";

import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useTranslations } from "next-intl";
import { LanguageSelect } from "@/components/ui/language-select";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Avatar } from "@/components/ui/avatar";
import { truncateAddress } from "@/lib/format";
import { deriveProfile, getWalletAddress } from "@/lib/user";
import { requestTourReplay, startDashboardTour } from "@/features/tour";

interface TopbarProps {
  onOpenAccount: () => void;
}

function CompassIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M15.5 8.5l-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Topbar({ onOpenAccount }: TopbarProps) {
  const { user } = usePrivy();
  const profile = deriveProfile(user);
  const address = getWalletAddress(user, "ethereum");
  const t = useTranslations("topbar");
  const tTour = useTranslations("tour");
  const router = useRouter();
  const pathname = usePathname();

  // Replays the walkthrough. The steps live on the dashboard, so any other
  // page parks a replay request and routes there first.
  const takeTour = () => {
    if (pathname === "/dashboard") {
      startDashboardTour(tTour);
    } else {
      requestTourReplay();
      router.push("/dashboard");
    }
  };

  // From md up this is the Market design's head: a 79px bar carrying the
  // designer's ray fan, no rule beneath it. The phone keeps the blurred black
  // bar it already had, which a separate redesign covers.
  return (
    <div className="relative z-[2] flex items-center gap-3 border-b border-white/7 bg-black/70 px-4 py-3.5 backdrop-blur-[14px] sm:px-5 md:h-[79px] md:border-b-0 md:bg-[#232323] md:bg-[url('/market/topbar-rays.svg')] md:bg-[length:100%_100%] md:bg-no-repeat md:px-5 md:py-[15px] md:backdrop-blur-none">
      {/* Who you are signed in as, and the wallet that holds the money. Tapping
          it opens the account modal. The design puts it back on the desktop
          head as well, beside the rail's own account chip. */}
      <button
        type="button"
        data-tour="profile"
        onClick={onOpenAccount}
        aria-label={t("account")}
        className="flex min-w-0 cursor-pointer items-center gap-2.5 text-left md:gap-2"
      >
        <Avatar seed={profile.avatarSeed} size={38} />
        <span className="flex min-w-0 flex-col md:gap-[5.43px]">
          <span className="block truncate font-sans text-[14px] font-semibold text-white md:font-serif md:text-[15px] md:leading-[17.4px] md:tracking-[-0.15px]">
            {profile.name}
          </span>
          {address ? (
            <span className="tnum block truncate text-[11.5px] font-normal text-white/45 md:font-serif md:text-[12px] md:leading-[14.3px] md:font-medium">
              {truncateAddress(address)}
            </span>
          ) : null}
        </span>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-1.75">
        {/* Replay of the first-visit walkthrough: a labelled pill from sm up,
            just the compass on a phone. The desktop design has no such control,
            so it stops at md; the phone keeps its own way back to the tour. */}
        <button
          type="button"
          onClick={takeTour}
          aria-label={tTour("replayCta")}
          className="ws-pressable flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-white/14 bg-white/5 px-[10px] text-white/75 sm:px-3.5 md:hidden"
        >
          <CompassIcon />
          <span className="hidden font-sans text-[12.5px] font-medium whitespace-nowrap sm:block">
            {tTour("replayCta")}
          </span>
        </button>
        {/* Language moves into the account modal on a phone rather than
            competing for the row. */}
        <span className="hidden md:block">
          <LanguageSelect variant="chrome" />
        </span>
        <NotificationBell />
      </div>
    </div>
  );
}
