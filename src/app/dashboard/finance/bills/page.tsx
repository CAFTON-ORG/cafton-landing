import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Button } from "@/components/dashboard/ui/button";
import { BillsTable } from "@/features/finance/components/bills-table";
import { NewBillDialog } from "@/features/finance/components/new-bill-dialog";
import { listBills, listVendors } from "@/features/finance/payable-repository";
import { BILL_TABLE } from "@/features/finance/table";
import { manilaDate } from "@/features/schedule/slots";
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

  const params = parseTableParams(searchParamsFromRecord(await searchParams), BILL_TABLE);
  const canCreate = can(staff, "payables:create");
  const [page, vendors] = await Promise.all([
    listBills(params, manilaDate(new Date())),
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
      <BillsTable page={page} />
    </>
  );
}
