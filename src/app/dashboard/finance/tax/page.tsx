import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { TaxRatesView } from "@/features/finance/components/tax-rates-view";
import { listTaxRates } from "@/features/finance/repository";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Tax rates" };

export default async function TaxPage() {
  const staff = await requirePageAccess("finance:view");
  if (!staff) return <AccessDenied area="the books" />;

  return (
    <>
      <PageHeader
        title="Tax rates"
        description="The rates documents can use. The business is on the 8% income tax option, so it charges no VAT; VAT stays here, switched off, in case that changes."
      />
      <TaxRatesView rates={await listTaxRates()} />
    </>
  );
}
