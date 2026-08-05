"use client";

import { use } from "react";
import { EarnPage } from "@/components/dashboard/earn/earn-page";
import { JobDetailSection } from "@/components/dashboard/earn/job-detail-section";

export default function EarnJobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  return (
    <EarnPage>
      <JobDetailSection slug={slug} />
    </EarnPage>
  );
}
