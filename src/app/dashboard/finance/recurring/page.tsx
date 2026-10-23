import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { listVendors } from "@/features/finance/payable-repository";
import { RecurringView } from "@/features/finance/components/recurring-view";
import { listRecurring } from "@/features/finance/recurring-repository";
import { listPostableAccounts } from "@/features/finance/repository";
import { manilaDate } from "@/features/schedule/slots";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Recurring" };

export default async function RecurringPage() {
  const staff = await requirePageAccess("payables:view");
  if (!staff) return <AccessDenied area="recurring bills" />;

  const [items, vendors, accounts] = await Promise.all([
    listRecurring(),
    listVendors(),
    listPostableAccounts(),
  ]);
  return (
    <>
      <PageHeader
        title="Recurring"
        description="Rent, hosting and subscriptions that come round again. Each makes a draft bill or an expense to approve when its date arrives; nothing is posted until someone approves it."
      />
      <RecurringView
        items={items}
        today={manilaDate(new Date())}
        vendors={vendors.filter((vendor) => vendor.active).map((v) => ({ id: v.id, name: v.name }))}
        costAccounts={accounts.filter((a) => a.type === "expense" || a.type === "asset")}
        paidFromAccounts={accounts.filter(
          (a) => a.type === "asset" || a.systemKey === "reimbursable",
        )}
      />
    </>
  );
}
