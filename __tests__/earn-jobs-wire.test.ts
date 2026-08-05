import { describe, expect, it } from "vitest";
import {
  toContractDetail,
  toJobPost,
  toMilestone,
  toMilestoneEscrowQuote,
  toMilestoneEscrowStatus,
  toMilestoneReleaseResult,
  toMyContracts,
  toMyProposals,
  toProposalsWithFreelancer,
  toPublicRatings,
  toTimeEntry,
} from "@/lib/earn/api/jobs/wire";

// The Jobs service serializes every Prisma Decimal as a JSON *string*, so
// these fixtures deliberately use strings where a money/hours field appears —
// that is the real wire shape, and the normalizers have to survive it.

describe("job post normalization", () => {
  it("reads a fixed-price post's budget range as exact minor units", () => {
    const post = toJobPost({
      id: "job_1",
      slug: "build-a-dashboard",
      title: "Build a dashboard",
      budgetType: "FIXED",
      minBudget: "500",
      maxBudget: "1500",
      token: "USDC",
      status: "OPEN",
    });

    // 6-decimal USDC: 500 -> 500_000_000 minor units, never a float.
    expect(post?.minBudget).toEqual({ minor: "500000000", token: "USDC", decimals: 6 });
    expect(post?.maxBudget).toEqual({ minor: "1500000000", token: "USDC", decimals: 6 });
    expect(post?.hourlyRate).toBeNull();
    expect(post?.budgetType).toBe("FIXED");
  });

  it("reads an hourly post's rate and leaves the fixed range null", () => {
    const post = toJobPost({
      id: "job_2",
      slug: "ongoing-frontend",
      budgetType: "HOURLY",
      hourlyRate: "85.5",
      token: "USDC",
      status: "OPEN",
    });

    expect(post?.hourlyRate).toEqual({ minor: "85500000", token: "USDC", decimals: 6 });
    expect(post?.minBudget).toBeNull();
    expect(post?.maxBudget).toBeNull();
  });

  it("drops a post with no id or slug rather than rendering it half-built", () => {
    expect(toJobPost({ id: "job_3" })).toBeNull();
    expect(toJobPost({ slug: "no-id" })).toBeNull();
    expect(toJobPost(null)).toBeNull();
  });

  it("falls back to DRAFT on a status it does not recognise", () => {
    // An unknown status must not read as OPEN: that would advertise a post
    // the service may not consider live.
    expect(toJobPost({ id: "j", slug: "s", status: "SOMETHING_NEW" })?.status).toBe("DRAFT");
  });

  it("keeps only well-formed skill groups", () => {
    const post = toJobPost({
      id: "j",
      slug: "s",
      skills: [{ skills: "Frontend", subskills: ["React", 42] }, { subskills: ["orphaned"] }, null],
    });

    expect(post?.skills).toEqual([{ skills: "Frontend", subskills: ["React"] }]);
  });
});

describe("proposal normalization", () => {
  it("carries the job post's token onto the proposed amount", () => {
    const [proposal] = toMyProposals(
      [
        {
          id: "p_1",
          jobPostId: "job_1",
          proposedAmount: "1200",
          status: "SUBMITTED",
          jobPost: { title: "Build a dashboard", slug: "build-a-dashboard", status: "OPEN" },
        },
      ],
      "USDC"
    );

    expect(proposal.proposedAmount).toEqual({ minor: "1200000000", token: "USDC", decimals: 6 });
    expect(proposal.jobPost).toEqual({
      title: "Build a dashboard",
      slug: "build-a-dashboard",
      status: "OPEN",
    });
  });

  it("keeps a sponsor-facing proposal's freelancer, including a missing wallet", () => {
    const [proposal] = toProposalsWithFreelancer([
      {
        id: "p_2",
        jobPostId: "job_1",
        status: "SHORTLISTED",
        freelancer: { username: "korex", photo: null, walletAddress: null },
      },
    ]);

    // walletAddress null is meaningful: a winner with no wallet cannot be paid.
    expect(proposal.freelancer).toEqual({
      username: "korex",
      photo: null,
      walletAddress: null,
    });
  });
});

describe("contract normalization", () => {
  it("splits /contracts/mine by side rather than flattening it", () => {
    const contracts = toMyContracts({
      asFreelancer: [{ id: "c_1", jobPostId: "j_1", jobPost: { title: "A", slug: "a" } }],
      asSponsor: [{ id: "c_2", jobPostId: "j_2", jobPost: { title: "B", slug: "b" } }],
    });

    expect(contracts.asFreelancer.map((c) => c.id)).toEqual(["c_1"]);
    expect(contracts.asSponsor.map((c) => c.id)).toEqual(["c_2"]);
  });

  it("returns both sides empty when the service sends nothing", () => {
    expect(toMyContracts(null)).toEqual({ asFreelancer: [], asSponsor: [] });
  });

  it("reads an hourly contract's agreedAmount, which doubles as the rate", () => {
    const contract = toContractDetail({
      id: "c_3",
      jobPostId: "j_3",
      budgetType: "HOURLY",
      agreedAmount: "85.5",
      status: "ACTIVE",
      jobPost: { title: "Ongoing", slug: "ongoing" },
      freelancer: { username: "korex", walletAddress: "0xabc" },
    });

    expect(contract?.agreedAmount).toEqual({ minor: "85500000", token: "USDC", decimals: 6 });
    expect(contract?.freelancer?.walletAddress).toBe("0xabc");
  });
});

describe("milestone normalization", () => {
  it("reads the amount and escrow fields off a funded milestone", () => {
    const milestone = toMilestone({
      id: "m_1",
      contractId: "c_1",
      title: "Design phase",
      amount: "500",
      order: 0,
      status: "FUNDED",
      escrowStatus: "FUNDED",
      escrowAmount: "500",
      escrowTxId: "0xdeadbeef",
      submissionLinks: ["https://example.com", 7],
    });

    expect(milestone?.amount).toEqual({ minor: "500000000", token: "USDC", decimals: 6 });
    expect(milestone?.escrowAmount).toEqual({ minor: "500000000", token: "USDC", decimals: 6 });
    expect(milestone?.escrowStatus).toBe("FUNDED");
    expect(milestone?.submissionLinks).toEqual(["https://example.com"]);
  });

  it("falls back to PENDING on an unknown status, which blocks every action", () => {
    // PENDING is the conservative choice: submit/approve/release all refuse
    // from it, so an unrecognised state can never green-light a payout.
    expect(toMilestone({ id: "m", contractId: "c", status: "WHO_KNOWS" })?.status).toBe("PENDING");
  });

  it("treats an absent escrowStatus as UNFUNDED", () => {
    expect(toMilestone({ id: "m", contractId: "c" })?.escrowStatus).toBe("UNFUNDED");
  });
});

describe("milestone escrow quote", () => {
  it("builds the amount from amountMinor and the quote's own token metadata", () => {
    const quote = toMilestoneEscrowQuote({
      escrowAddress: "0xescrow",
      listingIdBytes32: "0xid",
      tokenAddress: "0xtoken",
      tokenSymbol: "USDC",
      decimals: 6,
      amount: "500",
      amountMinor: "500000000",
      refundableAfter: 1893456000,
      alreadyFunded: false,
      depositedOnChain: false,
    });

    // Taken straight off amountMinor, not re-derived from the display amount.
    expect(quote?.amount).toEqual({ minor: "500000000", token: "USDC", decimals: 6 });
    expect(quote?.refundableAfter).toBe(1893456000);
    expect(quote?.alreadyFunded).toBe(false);
  });

  it("returns null when the deposit target is incomplete", () => {
    // Without an escrow address or listing id there is nowhere safe to send
    // funds, so this must fail loudly rather than yield a partial quote.
    expect(toMilestoneEscrowQuote({ escrowAddress: "0xescrow" })).toBeNull();
    expect(toMilestoneEscrowQuote(null)).toBeNull();
  });
});

describe("milestone escrow status", () => {
  it("reports an unconfigured escrow as such", () => {
    expect(toMilestoneEscrowStatus({ configured: false })).toEqual({ configured: false });
    expect(toMilestoneEscrowStatus(null)).toEqual({ configured: false });
  });

  it("reads a configured escrow's on-chain state", () => {
    expect(
      toMilestoneEscrowStatus({
        configured: true,
        state: "Funded",
        owesFreelancer: true,
        freelancerHasNoWallet: true,
        refundableAfter: "2030-01-01T00:00:00.000Z",
      })
    ).toEqual({
      configured: true,
      state: "Funded",
      owesFreelancer: true,
      freelancerHasNoWallet: true,
      refundableAfter: "2030-01-01T00:00:00.000Z",
    });
  });
});

describe("milestone release result", () => {
  it("keeps a successful release's tx id", () => {
    expect(
      toMilestoneReleaseResult({ released: true, reason: "released", txId: "0xfeed" })
    ).toEqual({ released: true, reason: "released", txId: "0xfeed", error: null });
  });

  it("reports an idempotent retry as not-released with its reason", () => {
    // A repeat call is safe and still resolves, so `released` is the only
    // field that says whether this call actually moved money.
    expect(toMilestoneReleaseResult({ released: false, reason: "already-released" })).toEqual({
      released: false,
      reason: "already-released",
      txId: null,
      error: null,
    });
  });

  it("treats a missing or unknown reason as a failure", () => {
    expect(toMilestoneReleaseResult(null).released).toBe(false);
    expect(toMilestoneReleaseResult(null).reason).toBe("failed");
    expect(toMilestoneReleaseResult({ released: false, reason: "nonsense" }).reason).toBe("failed");
  });
});

describe("time entry normalization", () => {
  it("reads decimal hours sent as a string", () => {
    const entry = toTimeEntry({
      id: "t_1",
      contractId: "c_1",
      date: "2026-08-05T00:00:00.000Z",
      hours: "2.5",
      status: "APPROVED",
    });

    expect(entry?.hours).toBe(2.5);
    expect(entry?.status).toBe("APPROVED");
  });

  it("reads an unparseable or negative hours value as zero", () => {
    expect(toTimeEntry({ id: "t", contractId: "c", hours: "abc" })?.hours).toBe(0);
    expect(toTimeEntry({ id: "t", contractId: "c", hours: -3 })?.hours).toBe(0);
  });
});

describe("public rating normalization", () => {
  it("keeps only well-formed rows", () => {
    const ratings = toPublicRatings([
      { id: "r_1", score: 5, review: "Great work", createdAt: "2026-08-01", raterId: "u_1" },
      { score: 4 },
    ]);

    expect(ratings).toEqual([
      { id: "r_1", score: 5, review: "Great work", createdAt: "2026-08-01", raterId: "u_1" },
    ]);
  });
});
