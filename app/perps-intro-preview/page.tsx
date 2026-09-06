import { PerpsIntro } from "@/features/trade";

// TEMPORARY preview harness for the Perps intro slide + chess-piece animation.
// Delete this route once the styling is signed off. View at phone width.
export default function PerpsIntroPreviewPage() {
  return (
    <div className="mx-auto w-full max-w-md bg-[#0f0f0f]">
      <PerpsIntro />
    </div>
  );
}
