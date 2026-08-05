"use client";

import { useState } from "react";
import { AsyncEmpty, AsyncError, AsyncLoading } from "@/components/dashboard/async-state";
import { RewardBadge } from "@/components/dashboard/earn/reward-badge";
import { FundMilestoneSheet } from "@/components/dashboard/earn/fund-milestone-sheet";
import { TextAreaField, TextField } from "@/components/dashboard/earn/form-field";
import {
  useApproveMilestone,
  useCompleteContract,
  useContract,
  useCreateMilestone,
  useMilestones,
  useReleaseMilestone,
  useSubmitMilestone,
} from "@/hooks/use-earn-contracts";
import { friendlyError } from "@/lib/errors";
import { toast } from "@/lib/toast";
import type { ContractStatus, Milestone, MilestoneStatus } from "@/lib/earn/api/jobs";

const PAGE = "mx-auto w-full max-w-[900px] px-4 pt-6 pb-20 sm:px-6";

const UNCONFIGURED_DETAIL = "This goes live once the earn service is switched on.";

const DECIMAL_INPUT = /^\d*\.?\d*$/;

const CONTRACT_TONE: Record<ContractStatus, string> = {
  ACTIVE: "border-accent/40 text-accent",
  COMPLETED: "border-up/40 text-up",
  DISPUTED: "border-down/40 text-down",
  CANCELLED: "border-white/10 text-white/35",
};

const MILESTONE_TONE: Record<MilestoneStatus, string> = {
  PENDING: "border-white/10 text-white/45",
  FUNDED: "border-accent/40 text-accent",
  SUBMITTED: "border-accent/40 text-accent",
  APPROVED: "border-up/40 text-up",
  RELEASED: "border-up/40 text-up",
  DISPUTED: "border-down/40 text-down",
  REFUNDED: "border-white/10 text-white/35",
};

const MILESTONE_LABEL: Record<MilestoneStatus, string> = {
  PENDING: "Not funded",
  FUNDED: "Funded",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  RELEASED: "Paid",
  DISPUTED: "Disputed",
  REFUNDED: "Refunded",
};

// What a milestone means from the freelancer's side. They cannot read
// escrow-status — it is sponsor-auth — so the milestone's own state is the
// only thing that can tell them whether the money is really committed and
// what has to happen before it reaches them.
const FREELANCER_STATE: Record<MilestoneStatus, string> = {
  PENDING: "Not funded yet. Wait for the company to put the money in escrow before you start.",
  FUNDED: "The money for this is in escrow. Safe to start — submit when it's done.",
  SUBMITTED: "With the company for review. They approve it, then release the payment.",
  APPROVED: "Approved. The company releases it from escrow and it lands in your wallet.",
  RELEASED: "Paid out to your wallet.",
  DISPUTED: "Under dispute. Payment is frozen until an admin resolves it.",
  REFUNDED: "Returned to the company. Nothing is owed on this one.",
};

// The workspace both sides of a contract share. Which actions appear depends on
// `role`: the sponsor funds, approves and releases; the freelancer submits.
// The service enforces this independently — this only decides what to offer.
export function ContractSection({ id, role }: { id: string; role: "sponsor" | "freelancer" }) {
  const { contract, isLoading, error } = useContract(id);

  if (error) {
    return (
      <div className={PAGE}>
        <AsyncError
          error={error}
          subject="this contract"
          unconfiguredDetail={UNCONFIGURED_DETAIL}
        />
      </div>
    );
  }

  if (isLoading || !contract) {
    return (
      <div className={PAGE}>
        <AsyncLoading label="Loading the contract" rows={5} />
      </div>
    );
  }

  const disputed = contract.status === "DISPUTED";

  return (
    <div className={PAGE}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="ws-display text-[clamp(20px,2.6vw,26px)] tracking-[-0.02em] text-white">
              {contract.jobPost?.title ?? "Contract"}
            </h1>
            <span
              className={`rounded-full border px-2.5 py-1 font-sans text-[11px] font-medium ${CONTRACT_TONE[contract.status]}`}
            >
              {contract.status === "ACTIVE"
                ? "Active"
                : contract.status === "COMPLETED"
                  ? "Completed"
                  : contract.status === "DISPUTED"
                    ? "Disputed"
                    : "Cancelled"}
            </span>
          </div>
          <p className="mt-1 font-sans text-[13px] font-normal text-white/50">
            {contract.budgetType === "HOURLY" ? "Hourly" : "Fixed price"}
            {contract.freelancer?.username ? ` · ${contract.freelancer.username}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <RewardBadge reward={contract.agreedAmount} />
          {role === "sponsor" && contract.status === "ACTIVE" ? (
            <CompleteContract id={contract.id} />
          ) : null}
        </div>
      </header>

      {/* A dispute freezes approve, release and billing service-side. Saying so
          once at the top beats every blocked button failing on its own. */}
      {disputed ? (
        <div className="border-down/30 mt-5 rounded-[14px] border px-4 py-3">
          <div className="text-down font-sans text-[12.5px] font-medium">
            This contract is under dispute.
          </div>
          <div className="mt-0.5 font-sans text-[12px] font-normal text-white/50">
            Approving and releasing milestones is frozen until an admin resolves it.
          </div>
        </div>
      ) : null}

      {/* A freelancer with no wallet on file cannot be paid when a milestone is
          released, and the sponsor is the one who finds out at payout time. */}
      {role === "sponsor" && contract.freelancer && !contract.freelancer.walletAddress ? (
        <div className="mt-5 rounded-[14px] border border-white/12 px-4 py-3">
          <div className="font-sans text-[12.5px] font-medium text-white/80">
            {contract.freelancer.username} has no wallet on file yet.
          </div>
          <div className="mt-0.5 font-sans text-[12px] font-normal text-white/50">
            They need one before a released milestone can actually pay out.
          </div>
        </div>
      ) : null}

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="ws-display text-[16px] text-white">Milestones</h2>
            <p className="mt-1 font-sans text-[13px] font-normal text-white/50">
              Each one is funded, delivered and paid on its own.
            </p>
          </div>
          {role === "sponsor" && contract.status === "ACTIVE" ? (
            <AddMilestone contractId={contract.id} token={contract.agreedAmount?.token ?? "USDC"} />
          ) : null}
        </div>

        <MilestoneList contractId={contract.id} role={role} frozen={disputed} />
      </section>
    </div>
  );
}

function CompleteContract({ id }: { id: string }) {
  const complete = useCompleteContract();
  const [confirming, setConfirming] = useState(false);

  async function onComplete() {
    const toastId = toast.loading("Completing…");
    try {
      await complete.mutateAsync(id);
      toast.success("Contract completed. You can rate each other now.", { id: toastId });
      setConfirming(false);
    } catch (error) {
      toast.error(friendlyError(error, "Couldn't complete that contract."), { id: toastId });
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="ws-inset cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-semibold text-white/75 transition-colors hover:text-white"
      >
        Complete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void onComplete()}
        disabled={complete.isPending}
        className="ws-inset cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      >
        {complete.isPending ? "Completing…" : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={complete.isPending}
        className="cursor-pointer rounded-full px-3 py-2 font-sans text-[12.5px] font-medium text-white/55 transition-colors hover:text-white disabled:cursor-not-allowed"
      >
        Cancel
      </button>
    </span>
  );
}

function AddMilestone({ contractId, token }: { contractId: string; token: string }) {
  const create = useCreateMilestone();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { milestones } = useMilestones(contractId);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!title.trim()) found.title = "Name this milestone.";
    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      found.amount = "Set what this milestone pays.";
    }
    setErrors(found);
    if (Object.keys(found).length) return;

    const id = toast.loading("Adding…");
    try {
      await create.mutateAsync({
        contractId,
        title: title.trim(),
        amount: value,
        // Appended, so a new milestone lands after the ones already agreed.
        order: milestones.length,
      });
      toast.success("Milestone added.", { id });
      setTitle("");
      setAmount("");
      setErrors({});
      setOpen(false);
    } catch (error) {
      toast.error(friendlyError(error, "Couldn't add that milestone."), { id });
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-accent text-ink cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-semibold"
      >
        Add milestone
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="ws-card w-full rounded-[16px] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <TextField
            label="What it covers"
            required
            value={title}
            error={errors.title}
            placeholder="Design phase"
            onChange={setTitle}
          />
        </div>
        <div className="sm:w-[180px]">
          <TextField
            label={`Amount (${token})`}
            required
            value={amount}
            error={errors.amount}
            placeholder="500"
            onChange={(value) => {
              if (value === "" || DECIMAL_INPUT.test(value)) setAmount(value);
            }}
          />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ws-inset cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-semibold text-white/70 transition-colors hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={create.isPending}
          className="bg-accent text-ink cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {create.isPending ? "Adding…" : "Add"}
        </button>
      </div>
    </form>
  );
}

function MilestoneList({
  contractId,
  role,
  frozen,
}: {
  contractId: string;
  role: "sponsor" | "freelancer";
  frozen: boolean;
}) {
  const { milestones, isLoading, error } = useMilestones(contractId);

  if (error) {
    return (
      <div className="mt-4">
        <AsyncError
          error={error}
          subject="the milestones"
          unconfiguredDetail={UNCONFIGURED_DETAIL}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-4">
        <AsyncLoading label="Loading milestones" rows={3} />
      </div>
    );
  }

  if (!milestones.length) {
    return (
      <div className="mt-4">
        <AsyncEmpty>
          {role === "sponsor"
            ? "No milestones yet. Add one to fund the first piece of work."
            : "No milestones yet. The company sets these up before work starts."}
        </AsyncEmpty>
      </div>
    );
  }

  return (
    <ul className="mt-4 flex flex-col gap-2.5">
      {milestones.map((milestone) => (
        <li key={milestone.id}>
          <MilestoneRow milestone={milestone} contractId={contractId} role={role} frozen={frozen} />
        </li>
      ))}
    </ul>
  );
}

function MilestoneRow({
  milestone,
  contractId,
  role,
  frozen,
}: {
  milestone: Milestone;
  contractId: string;
  role: "sponsor" | "freelancer";
  frozen: boolean;
}) {
  const submit = useSubmitMilestone(contractId);
  const approve = useApproveMilestone(contractId);
  const release = useReleaseMilestone(contractId);
  const [funding, setFunding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");

  const sponsor = role === "sponsor";

  async function onSubmitWork(event: React.FormEvent) {
    event.preventDefault();
    const id = toast.loading("Submitting…");
    try {
      await submit.mutateAsync({ id: milestone.id, input: { note: note.trim() || undefined } });
      toast.success("Sent for review.", { id });
      setNote("");
      setSubmitting(false);
    } catch (error) {
      toast.error(friendlyError(error, "Couldn't submit that work."), { id });
    }
  }

  async function onApprove() {
    const id = toast.loading("Approving…");
    try {
      await approve.mutateAsync(milestone.id);
      toast.success("Approved. You can release the payment now.", { id });
    } catch (error) {
      toast.error(friendlyError(error, "Couldn't approve that milestone."), { id });
    }
  }

  async function onRelease() {
    const id = toast.loading("Releasing…");
    try {
      const result = await release.mutateAsync(milestone.id);
      // The call is idempotent and resolves even when it moved nothing, so
      // `released` is what decides the message — not the absence of a throw.
      if (result.released) {
        toast.success("Paid. The money is on its way to them.", { id });
      } else {
        toast.error(releaseFailureText(result.reason), { id });
      }
    } catch (error) {
      toast.error(friendlyError(error, "Couldn't release that payment."), { id });
    }
  }

  return (
    <div className="ws-card rounded-[16px] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="ws-display truncate text-[14.5px] text-white">{milestone.title}</div>
          {milestone.description ? (
            <div className="mt-0.5 font-sans text-[12px] font-normal text-white/45">
              {milestone.description}
            </div>
          ) : null}
          {milestone.submissionNote ? (
            <div className="mt-1.5 font-sans text-[12px] font-normal whitespace-pre-line text-white/55">
              {milestone.submissionNote}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <RewardBadge reward={milestone.amount} />
          <span
            className={`rounded-full border px-2.5 py-1 font-sans text-[11px] font-medium ${MILESTONE_TONE[milestone.status]}`}
          >
            {MILESTONE_LABEL[milestone.status]}
          </span>
        </div>
      </div>

      {submitting ? (
        <form onSubmit={onSubmitWork} noValidate className="mt-3">
          <TextAreaField
            label="Anything to tell them"
            rows={3}
            value={note}
            onChange={setNote}
            placeholder="Optional. A link to the work, or what changed."
          />
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => setSubmitting(false)}
              className="ws-inset cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-semibold text-white/70 transition-colors hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submit.isPending}
              className="bg-accent text-ink cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submit.isPending ? "Submitting…" : "Submit for review"}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {sponsor && milestone.status === "PENDING" ? (
            <button
              type="button"
              onClick={() => setFunding(true)}
              className="bg-accent text-ink cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-semibold"
            >
              Fund
            </button>
          ) : null}

          {!sponsor && milestone.status === "FUNDED" ? (
            <button
              type="button"
              onClick={() => setSubmitting(true)}
              className="bg-accent text-ink cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-semibold"
            >
              Submit work
            </button>
          ) : null}

          {sponsor && milestone.status === "SUBMITTED" ? (
            <button
              type="button"
              onClick={() => void onApprove()}
              disabled={approve.isPending || frozen}
              className="bg-accent text-ink cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {approve.isPending ? "Approving…" : "Approve"}
            </button>
          ) : null}

          {sponsor && milestone.status === "APPROVED" ? (
            <button
              type="button"
              onClick={() => void onRelease()}
              disabled={release.isPending || frozen}
              className="bg-accent text-ink cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {release.isPending ? "Releasing…" : "Release payment"}
            </button>
          ) : null}

          {!sponsor ? (
            <span className="font-sans text-[12px] font-normal text-white/40">
              {FREELANCER_STATE[milestone.status]}
            </span>
          ) : null}
        </div>
      )}

      {funding ? (
        <FundMilestoneSheet
          open={funding}
          onClose={() => setFunding(false)}
          contractId={contractId}
          milestoneId={milestone.id}
          milestoneTitle={milestone.title}
        />
      ) : null}
    </div>
  );
}

// A release that moved nothing still resolves, so each reason gets the thing
// the sponsor actually has to do about it.
function releaseFailureText(reason: string): string {
  switch (reason) {
    case "already-released":
      return "This milestone was already paid.";
    case "not-approved":
      return "Approve the work before releasing the payment.";
    case "not-funded":
      return "This milestone hasn't been funded yet.";
    case "not-configured":
      return "Escrow isn't switched on for this milestone.";
    default:
      return "The payment didn't go through. Try again in a moment.";
  }
}
