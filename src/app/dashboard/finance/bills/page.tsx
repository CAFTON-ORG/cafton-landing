import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Button } from "@/components/dashboard/ui/button";
import { BillsTable } from "@/features/finance/components/bills-table";
import { NewBillDialog } from "@/features/finance/components/new-bill-dialog";
import { StatusTabs } from "@/features/finance/components/status-tabs";
import { SummaryStrip, plural } from "@/features/finance/components/summary-strip";
import { billSummary, listBills, listVendors } from "@/features/finance/repository/payables";
import { BILL_TABLE } from "@/features/finance/table";
import { manilaDate } from "@/features/schedule/rules/slots";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { parseTableParams, searchParamsFromRecord } from "@/lib/table-params";

export const metadata: Metadata = { title: "Bills" };

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("payables:view");
  if (!staff) return <AccessDenied area="bills" />;

  const today = manilaDate(new Date());
  const params = parseTableParams(searchParamsFromRecord(await searchParams), BILL_TABLE);
  const canCreate = can(staff, "payables:create");
  const [page, summary, vendors] = await Promise.all([
    listBills(params, today),
    billSummary(today),
    canCreate ? listVendors() : [],
  ]);

  return (
    <>
      <PageHeader
        title="Bills"
        description="What suppliers have billed you. Approving a bill posts it to the books as owed; paying it moves the money out. A mistake is fixed by voiding it, never by editing."
        action={
          canCreate ? (
            <NewBillDialog
              vendors={vendors.filter((vendor) => vendor.active)}
              trigger={
                <Button>
                  <Plus aria-hidden="true" /> New bill
                </Button>
              }
            />
          ) : undefined
        }
      />
      <SummaryStrip
        items={[
          {
            label: "Overdue",
            amountMinor: summary.overdue.amountMinor,
            detail: plural(summary.overdue.count, "bill"),
            href: "/dashboard/finance/bills?state=overdue",
            tone: summary.overdue.count > 0 ? "danger" : "neutral",
          },
          {
            label: "Due in the next 7 days",
            amountMinor: summary.dueSoon.amountMinor,
            detail: plural(summary.dueSoon.count, "bill"),
            href: "/dashboard/finance/bills?state=awaiting",
            tone: summary.dueSoon.count > 0 ? "warning" : "neutral",
          },
          {
            label: "Awaiting payment",
            amountMinor: summary.awaiting.amountMinor,
            detail: plural(summary.awaiting.count, "bill"),
            href: "/dashboard/finance/bills?state=awaiting",
          },
          {
            label: "Drafts to check",
            amountMinor: summary.draft.amountMinor,
            detail: plural(summary.draft.count, "bill"),
            href: "/dashboard/finance/bills?state=draft",
          },
        ]}
      />
      <StatusTabs
        param="state"
        label="Bill status"
        tabs={[
          { value: "", label: "All", count: summary.counts.all },
          { value: "draft", label: "Draft", count: summary.counts.draft },
          { value: "awaiting", label: "Awaiting payment", count: summary.counts.awaiting },
          { value: "overdue", label: "Overdue", count: summary.counts.overdue },
          { value: "paid", label: "Paid", count: summary.counts.paid },
          { value: "void", label: "Void", count: summary.counts.void },
        ]}
      />
      <BillsTable page={page} today={today} />
    </>
  );
}
