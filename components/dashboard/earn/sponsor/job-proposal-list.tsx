"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AsyncEmpty, AsyncError, AsyncLoading } from "@/components/dashboard/async-state";
import { RewardBadge } from "@/components/dashboard/earn/reward-badge";
import { useHireProposal, useProposalsForJob, useShortlistProposal } from "@/hooks/use-earn-jobs";
import { friendlyError } from "@/lib/errors";
import { toast } from "@/lib/toast";
import type { ProposalStatus, ProposalWithFreelancer } from "@/lib/earn/api/jobs";

const STATUS_STYLE: Record<ProposalStatus, string> = {
  ACCEPTED: "border-up/40 text-up",
  SHORTLISTED: "border-accent/40 text-accent",
  SUBMITTED: "border-white/10 text-white/55",
  REJECTED: "border-white/10 text-white/35",
  WITHDRAWN: "border-white/10 text-white/35",
};

const STATUS_LABEL: Record<ProposalStatus, string> = {
  ACCEPTED: "Hired",
  SHORTLISTED: "Shortlisted",
  SUBMITTED: "New",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

// Bids on one job post, and the two actions a sponsor takes on them. Hiring is
// deliberately a two-step confirm: it accepts this proposal, auto-rejects
// every other one, closes the job and opens a contract, none of which can be
// undone from here.
export function JobProposalList({ jobPostId }: { jobPostId: string }) {
  const router = useRouter();
  const { proposals, isLoading, error } = useProposalsForJob(jobPostId);
  const shortlist = useShortlistProposal(jobPostId);
  const hire = useHireProposal();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  async function onShortlist(proposal: ProposalWithFreelancer) {
    setActing(proposal.id);
    const id = toast.loading("Shortlisting…");
    try {
      await shortlist.mutateAsync(proposal.id);
      toast.success("Shortlisted.", { id });
    } catch (shortlistError) {
      toast.error(friendlyError(shortlistError, "Couldn't shortlist that proposal."), { id });
    } finally {
      setActing(null);
    }
  }

  async function onHire(proposal: ProposalWithFreelancer) {
    setActing(proposal.id);
    const id = toast.loading("Hiring…");
    try {
      const contract = await hire.mutateAsync(proposal.id);
      toast.success("Hired. Your contract is open.", { id });
      router.push(`/earn/sponsor/contract/${contract.id}`);
    } catch (hireError) {
      toast.error(friendlyError(hireError, "Couldn't hire that freelancer."), { id });
      setActing(null);
      setConfirming(null);
    }
  }

  if (error) {
    return (
      <AsyncError
        error={error}
        subject="the proposals"
        unconfiguredDetail="This goes live once the earn service is switched on."
      />
    );
  }

  if (isLoading) return <AsyncLoading label="Loading proposals" rows={4} />;

  if (!proposals.length) {
    return <AsyncEmpty>No proposals yet. They show up here as freelancers apply.</AsyncEmpty>;
  }

  // Once somebody is hired the job is closed, so the remaining bids are history
  // rather than choices. Actions come off every row at that point.
  const hired = proposals.some((proposal) => proposal.status === "ACCEPTED");

  return (
    <ul className="flex flex-col gap-2.5">
      {proposals.map((proposal) => {
        const busy = acting === proposal.id;
        const open = proposal.status === "SUBMITTED" || proposal.status === "SHORTLISTED";
        const actionable = open && !hired;

        return (
          <li key={proposal.id} className="ws-card rounded-[16px] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="ws-display truncate text-[14.5px] text-white">
                  {proposal.freelancer?.username || "Unnamed freelancer"}
                </div>
                {proposal.proposedDuration ? (
                  <div className="mt-0.5 font-sans text-[12px] font-normal text-white/45">
                    Estimates {proposal.proposedDuration}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2.5">
                <RewardBadge reward={proposal.proposedAmount} />
                <span
                  className={`rounded-full border px-2.5 py-1 font-sans text-[11px] font-medium ${STATUS_STYLE[proposal.status]}`}
                >
                  {STATUS_LABEL[proposal.status]}
                </span>
              </div>
            </div>

            {proposal.coverLetter ? (
              <p className="mt-3 font-sans text-[13px] leading-[1.55] font-normal whitespace-pre-line text-white/65">
                {proposal.coverLetter}
              </p>
            ) : null}

            {proposal.attachments.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {proposal.attachments.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="ws-inset inline-block rounded-full px-3 py-1.5 font-sans text-[11.5px] font-medium text-white/70 hover:text-white"
                    >
                      Attachment
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}

            {/* A freelancer with no wallet on file cannot be paid when a
                milestone is released, so it is worth knowing before hiring
                rather than at payout. */}
            {actionable && !proposal.freelancer?.walletAddress ? (
              <p className="text-down mt-3 font-sans text-[11.5px] font-normal">
                No wallet on file yet. They will need one before a milestone can pay out.
              </p>
            ) : null}

            {actionable ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {proposal.status === "SUBMITTED" ? (
                  <button
                    type="button"
                    onClick={() => void onShortlist(proposal)}
                    disabled={busy}
                    className="ws-inset cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-semibold text-white/75 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Shortlist
                  </button>
                ) : null}

                {confirming === proposal.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void onHire(proposal)}
                      disabled={busy}
                      className="bg-accent text-ink cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busy ? "Hiring…" : "Yes, hire them"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      disabled={busy}
                      className="cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-medium text-white/55 transition-colors hover:text-white disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <p className="w-full font-sans text-[11.5px] font-normal text-white/45">
                      This closes the job and turns down everyone else who applied.
                    </p>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(proposal.id)}
                    disabled={busy}
                    className="bg-accent text-ink cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Hire
                  </button>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
