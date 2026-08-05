"use client";

import { use } from "react";
import { EarnPage } from "@/components/dashboard/earn/earn-page";
import { SponsorJobSection } from "@/components/dashboard/earn/sponsor/sponsor-job-section";

export default function EarnSponsorJobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  return (
    <EarnPage>
      <SponsorJobSection slug={slug} />
    </EarnPage>
  );
}
