import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { ContractEditor } from "@/features/contracts/components/contract-editor";
import { ContractStatusBadge } from "@/features/contracts/components/contract-status-badge";
import { getContract } from "@/features/contracts/repository/contracts";
import { CONTRACT_KIND_LABEL } from "@/features/contracts/rules/core";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Contract" };

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("contracts:view");
  if (!staff) return <AccessDenied area="contracts" />;

  const { id } = await params;
  const contract = await getContract(id);
  if (!contract) notFound();

  return (
    <>
      <BackLink href="/dashboard/sales/contracts">All contracts</BackLink>
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{contract.reference}</h1>
          <ContractStatusBadge status={contract.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          {CONTRACT_KIND_LABEL[contract.kind]} · {contract.title}
        </p>
      </div>
      <ContractEditor key={`${contract.id}-${contract.status}`} contract={contract} />
    </>
  );
}
