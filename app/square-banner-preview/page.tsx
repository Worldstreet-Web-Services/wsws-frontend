import { SquareLiveBannerCard } from "@/components/ui/square-live-banner";

// TEMPORARY preview harness for the Market Square mobile banner. Delete this
// route once the styling is signed off. The banner is sm:hidden, so view this
// at a phone width (device toolbar or a narrow window under 640px).
export default function SquareBannerPreviewPage() {
  return (
    <div className="min-h-screen bg-[#0d0d0f] p-4">
      <p className="mb-3 text-[12px] text-white/50">
        Preview at phone width (&lt;640px). This route is temporary.
      </p>
      <div className="mx-auto w-full max-w-[420px]">
        <SquareLiveBannerCard href="#preview" />
      </div>
    </div>
  );
}
