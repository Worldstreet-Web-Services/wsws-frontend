import { SetTheStakeBanner } from "@/features/portfolio/components/set-the-stake-banner";

// TEMPORARY preview harness for the "Set the stake" banner (Figma node 1:2689).
// The first row is the exact 337px design width for a pixel comparison; the
// second is full phone width. Delete this route once the banner is signed off.
export default function SetTheStakePreviewPage() {
  return (
    <div className="min-h-screen space-y-8 bg-[#0d0d0f] p-4">
      <div>
        <p className="mb-2 text-[12px] text-white/50">At 337px (design width):</p>
        <div className="w-[337px]">
          <SetTheStakeBanner />
        </div>
      </div>
      <div>
        <p className="mb-2 text-[12px] text-white/50">Full phone width:</p>
        <div className="max-w-md">
          <SetTheStakeBanner />
        </div>
      </div>
    </div>
  );
}
