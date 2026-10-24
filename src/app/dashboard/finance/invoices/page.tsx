import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Button } from "@/components/dashboard/ui/button";
import { InvoicesTable } from "@/features/finance/components/invoices-table";
import { NewInvoiceDialog } from "@/features/finance/components/new-invoice-dialog";
import { StatusTabs } from "@/features/finance/components/status-tabs";
import { SummaryStrip, plural } from "@/features/finance/components/summary-strip";
import {
  invoiceSummary,
  listBillableMilestones,
  listBillableTime,
  listInvoiceableQuotes,
  listInvoices,
} from "@/features/finance/repository/invoices";
import { INVOICE_TABLE } from "@/features/finance/table";
import { manilaDate } from "@/features/schedule/rules/slots";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { parseTableParams, searchParamsFromRecord } from "@/lib/table-params";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("invoices:view");
  if (!staff) return <AccessDenied area="invoices" />;

  const today = manilaDate(new Date());
  const params = parseTableParams(searchParamsFromRecord(await searchParams), INVOICE_TABLE);
  const canCreate = can(staff, "invoices:create");
  const [page, summary, quotes, milestones, time] = await Promise.all([
    listInvoices(params, today),
    invoiceSummary(today),
    canCreate ? listInvoiceableQuotes() : [],
    canCreate ? listBillableMilestones() : [],
    canCreate ? listBillableTime() : [],
  ]);

  return (
    <>
      <PageHeader
        title="Invoices"
        description="What clients owe. Issuing an invoice numbers it, posts it to the books and locks it; a mistake is fixed by voiding it, never by editing."
        action={
          canCreate ? (
            <NewInvoiceDialog
              quotes={quotes}
              milestones={milestones}
              time={time}
              today={today}
              trigger={
                <Button>
                  <Plus aria-hidden="true" /> New invoice
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
            detail: plural(summary.overdue.count, "invoice"),
            href: "/dashboard/finance/invoices?state=overdue",
            tone: summary.overdue.count > 0 ? "danger" : "neutral",
          },
          {
            label: "Awaiting payment",
            amountMinor: summary.awaiting.amountMinor,
            detail: plural(summary.awaiting.count, "invoice"),
            href: "/dashboard/finance/invoices?state=awaiting",
          },
          {
            label: "Paid in the last 30 days",
            amountMinor: summary.paidRecently.amountMinor,
            detail: plural(summary.paidRecently.count, "invoice"),
            href: "/dashboard/finance/invoices?state=paid",
            tone: "success",
          },
          {
            label: "Drafts",
            amountMinor: summary.draft.amountMinor,
            detail: plural(summary.draft.count, "invoice"),
            href: "/dashboard/finance/invoices?state=draft",
          },
        ]}
      />
      <StatusTabs
        param="state"
        label="Invoice status"
        tabs={[
          { value: "", label: "All", count: summary.counts.all },
          { value: "draft", label: "Draft", count: summary.counts.draft },
          { value: "awaiting", label: "Awaiting payment", count: summary.counts.awaiting },
          { value: "overdue", label: "Overdue", count: summary.counts.overdue },
          { value: "paid", label: "Paid", count: summary.counts.paid },
          { value: "void", label: "Void", count: summary.counts.void },
        ]}
      />
      <InvoicesTable page={page} today={today} />
    </>
  );
}
