"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { fetchChallengeByInvite } from "@/features/casino/lib/api/chess";
import { useCasinoWallet } from "@/features/casino/hooks/use-casino-wallet";
import { useFundedChessChallenge } from "@/features/casino/hooks/use-funded-chess-challenge";
import { exceedsUsdcBalance } from "@/features/casino/lib/api/cashier";
import { WagerSummary } from "@/features/casino/components/chess/wager-summary";
import { CasinoEmpty, CasinoError, CasinoLoading } from "@/features/casino/components/casino-state";
import { track } from "@/lib/analytics/mixpanel";
import { BRAND } from "@/lib/brand";
import { copyText } from "@/lib/clipboard";
import { friendlyError } from "@/lib/errors";
import { shareOrigin } from "@/lib/site-url";
import { toast } from "@/lib/toast";

// The common chess namespace names the speed after its preset, so the label
// reads "5+3 Blitz" in every locale.
function timeControlLabel(t: ReturnType<typeof useTranslations>, tc: string): string {
  return tc === "3+2" || tc === "5+3" ? t("blitz", { tc }) : t("rapid", { tc });
}

// Landing screen for a challenge link. The route supplies the shared chess
// shell while this component keeps the offer itself deliberately focused.
export function InviteSection({ inviteCode }: { inviteCode: string | null }) {
  const t = useTranslations("casino.chess.invite");
  const tCommon = useTranslations("casino.chess.common");
  const tStake = useTranslations("casino.chess.stake");
  const router = useRouter();
  const wallet = useCasinoWallet();
  const funded = useFundedChessChallenge();

  const {
    data: challenge,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["casino", "chess", "invite", inviteCode ?? "none"],
    queryFn: () => fetchChallengeByInvite(inviteCode as string),
    enabled: !!inviteCode,
  });

  const frame = (children: React.ReactNode) => (
    <div className="flex min-h-[calc(100svh-105px)] items-center justify-center px-4 py-8 sm:px-6 md:min-h-[calc(100svh-60px)]">
      <div className="ws-glass w-full max-w-[440px] rounded-[18px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-5 text-center shadow-[0_30px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-9">
        {children}
      </div>
    </div>
  );

  if (!inviteCode) return frame(<CasinoEmpty>{t("missingCode")}</CasinoEmpty>);
  if (error) return frame(<CasinoError error={error} subject={t("subject")} />);
  if (isLoading || !challenge) return frame(<CasinoLoading label={t("loading")} rows={4} />);

  // A staked challenge locks the same amount from the joiner. Surface it before
  // they take the seat rather than failing them at the server.
  const staked =
    challenge.stakeUsdc && Number(challenge.stakeUsdc) > 0 ? challenge.stakeUsdc : null;
  const insufficient = !!staked && exceedsUsdcBalance(staked, funded.availableUsdc);
  const fundingUnavailable = !!staked && !funded.configured;
  const owner =
    !!wallet.address &&
    challenge.creator.walletAddress.toLowerCase() === wallet.address.toLowerCase();
  const inviteUrl = `${shareOrigin()}/casino/chess/invite?code=${encodeURIComponent(challenge.id)}`;
  const fundingMessage = fundingUnavailable
    ? "Funded chess games are not available right now."
    : funded.balanceLoading
      ? "Loading your Base USDC balance..."
      : insufficient && staked
        ? tStake("needsBalance", { amount: staked })
        : staked
          ? `Accepting transfers and locks ${staked} USDC from your Base wallet.`
          : null;

  const onAccept = async () => {
    if (!wallet.connected) {
      toast.error(t("toastSignIn"));
      return;
    }
    if (fundingUnavailable) {
      toast.error("Funded chess games are not available right now.");
      return;
    }
    if (insufficient && staked) {
      toast.error(tStake("needsBalance", { amount: staked }), { sensitive: true });
      return;
    }
    const id = toast.loading(t("takingSeat"));
    try {
      const match = await funded.accept(challenge.id, staked);
      toast.success(tCommon("youAreIn"), { id });
      router.push(`/casino/chess/play?match=${match.id}`);
    } catch (e) {
      toast.error(friendlyError(e, t("toastAcceptFailed")), { id });
    }
  };

  if (owner) {
    return frame(
      <>
        <div className="ws-display mb-5 text-[18px]">Challenge created</div>
        <div className="mx-auto mb-3.5 h-14 w-14 rounded-full border border-white/10 bg-white/8" />
        <div className="text-[15px]">{challenge.creator.username}</div>
        <div className="mb-5 text-[12px] font-normal text-white/50">
          {timeControlLabel(tCommon, challenge.timeControl)}
          {challenge.videoEnabled ? " · Video match" : ""}
        </div>
        {staked ? (
          <div className="mb-5 text-left">
            <WagerSummary
              stakeUsdc={staked}
              availableUsdc={funded.availableUsdc}
              feeBps={challenge.feeBps ?? funded.feeBps}
            />
            <div className="mt-2 text-center text-[11.5px] font-normal text-white/50">
              {staked} USDC is locked. Your opponent must fund the same amount.
            </div>
          </div>
        ) : null}
        <label className="mb-2 block text-left text-[11px] font-semibold tracking-[0.08em] text-white/45 uppercase">
          Share this link
        </label>
        <div className="mb-5 flex gap-2">
          <input
            readOnly
            value={inviteUrl}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-[12px] text-white/70 outline-none"
          />
          <button
            type="button"
            onClick={() => {
              void copyText(inviteUrl).then((copied) =>
                copied ? toast.success("Challenge link copied.") : toast.error("Couldn't copy link.")
              );
            }}
            className="cursor-pointer rounded-xl border border-white/15 px-4 text-[12px] font-semibold text-white hover:border-white/30"
          >
            Copy
          </button>
        </div>
        <div className="mb-5 text-[12.5px] font-normal text-white/55">
          {staked
            ? "Waiting for your opponent to open the link and fund their seat."
            : "Waiting for your opponent to open the link."}
        </div>
        <Link
          href="/casino/chess"
          className="block w-full p-1.5 text-[12.5px] font-normal text-white/50 hover:text-white"
        >
          Back to chess
        </Link>
      </>
    );
  }

  return frame(
    <>
      <div className="ws-display mb-5 text-[18px]">{t("title", { brand: BRAND })}</div>
      <div className="mx-auto mb-3.5 h-14 w-14 rounded-full border border-white/10 bg-white/8" />
      <div className="text-[15px]">{challenge.creator.username}</div>
      <div className="mb-5 text-[12px] font-normal text-white/50">
        {timeControlLabel(tCommon, challenge.timeControl)}
        {challenge.videoEnabled ? " · Video match" : ""}
      </div>
      {staked ? (
        <div className="mb-5 text-left">
          <WagerSummary
            stakeUsdc={staked}
            availableUsdc={funded.availableUsdc}
            feeBps={challenge.feeBps ?? funded.feeBps}
          />
          <div className="mt-2 text-center text-[11.5px] font-normal text-white/50">
            {fundingMessage}
          </div>
        </div>
      ) : (
        <div className="mb-6 text-[12.5px] font-normal text-white/55">{t("waitingNote")}</div>
      )}
      <button
        onClick={() => void onAccept()}
        disabled={funded.isPending || funded.balanceLoading || insufficient || fundingUnavailable}
        className="text-ink mb-2.5 block w-full cursor-pointer rounded-full bg-white p-3.5 font-sans text-[14px] font-medium transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {funded.isPending
          ? staked
            ? "Funding on Base..."
            : t("takingSeat")
          : staked
            ? `Accept and fund ${staked} USDC`
            : t("accept")}
      </button>
      {/* Walking away from an invite is the other half of accepting it: without
          it the funnel only ever shows the seats that were taken. */}
      <Link
        href="/casino/chess"
        onClick={() => track("chess_challenge_declined")}
        className="block w-full p-1.5 text-[12.5px] font-normal text-white/50 hover:text-white"
      >
        {t("decline")}
      </Link>
    </>
  );
}
