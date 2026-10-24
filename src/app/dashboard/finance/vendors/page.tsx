import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { VendorsView } from "@/features/finance/components/vendors-view";
import { listVendors } from "@/features/finance/repository/payables";
import { listPostableAccounts } from "@/features/finance/repository/ledger";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Suppliers" };

export default async function VendorsPage() {
  const staff = await requirePageAccess("payables:view");
  if (!staff) return <AccessDenied area="suppliers" />;

  const [vendors, accounts] = await Promise.all([listVendors(), listPostableAccounts()]);
  return (
    <>
      <PageHeader
        title="Suppliers"
        description="The people and companies you buy from, and what you owe each."
      />
      <VendorsView
        vendors={vendors}
        accounts={accounts.filter(
          (account) => account.type === "expense" || account.type === "asset",
        )}
      />
    </>
  );
}
