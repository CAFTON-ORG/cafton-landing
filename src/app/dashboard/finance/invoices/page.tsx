import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Button } from "@/components/dashboard/ui/button";
import { InvoicesTable } from "@/features/finance/components/invoices-table";
import { NewInvoiceDialog } from "@/features/finance/components/new-invoice-dialog";
import {
  listBillableMilestones,
  listInvoiceableQuotes,
  listInvoices,
} from "@/features/finance/invoice-repository";
import { INVOICE_TABLE } from "@/features/finance/table";
import { manilaDate } from "@/features/schedule/slots";
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

  const params = parseTableParams(searchParamsFromRecord(await searchParams), INVOICE_TABLE);
  const canCreate = can(staff, "invoices:create");
  const [page, quotes, milestones] = await Promise.all([
    listInvoices(params, manilaDate(new Date())),
    canCreate ? listInvoiceableQuotes() : [],
    canCreate ? listBillableMilestones() : [],
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
              trigger={
                <Button>
                  <Plus aria-hidden="true" /> New invoice
                </Button>
              }
            />
          ) : undefined
        }
      />
      <InvoicesTable page={page} />
    </>
  );
}
