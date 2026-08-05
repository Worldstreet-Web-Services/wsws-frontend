"use client";

import { use } from "react";
import { EarnPage } from "@/components/dashboard/earn/earn-page";
import { ContractSection } from "@/components/dashboard/earn/contract-section";

// The freelancer's side of a contract. The sponsor's is
// /earn/sponsor/contract/[id].
export default function EarnContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <EarnPage>
      <ContractSection id={id} role="freelancer" />
    </EarnPage>
  );
}
