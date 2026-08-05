"use client";

import { use } from "react";
import { EarnPage } from "@/components/dashboard/earn/earn-page";
import { ContractSection } from "@/components/dashboard/earn/contract-section";

// The sponsor's side of a contract. The freelancer's is /earn/contract/[id];
// both read the same record, and the service checks the caller is a party to
// it either way — the split only decides which actions are offered.
export default function EarnSponsorContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <EarnPage>
      <ContractSection id={id} role="sponsor" />
    </EarnPage>
  );
}
