import type { Metadata } from "next";
import { CircleCheck } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import { payablesAging } from "@/features/finance/payable-repository";
import { manilaDate } from "@/features/schedule/slots";
import { requirePageAccess } from "@/lib/auth/dal";
import { formatMinor } from "@/lib/money";

export const metadata: Metadata = { title: "Payables" };

export default async function PayablesPage() {
  const staff = await requirePageAccess("payables:view");
  if (!staff) return <AccessDenied area="payables" />;

  const rows = await payablesAging(manilaDate(new Date()));
  const sum = (pick: (row: (typeof rows)[number]) => number) =>
    rows.reduce((total, row) => total + pick(row), 0);
  const cols = [
    { label: "Not yet due", pick: (row: (typeof rows)[number]) => row.current },
    { label: "1-30 days late", pick: (row: (typeof rows)[number]) => row.d1_30 },
    { label: "31-60 days", pick: (row: (typeof rows)[number]) => row.d31_60 },
    { label: "61-90 days", pick: (row: (typeof rows)[number]) => row.d61_90 },
    { label: "Over 90 days", pick: (row: (typeof rows)[number]) => row.d90 },
  ];

  return (
    <>
      <PageHeader title="Payables" description="What you owe suppliers, by how late it is." />
      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState
              icon={CircleCheck}
              title="You do not owe anyone"
              description="Approved bills that are still unpaid appear here."
            />
          ) : (
            <div
              className="overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label="Aging by supplier, scrolls sideways"
            >
              <table className="w-full text-sm">
                <caption className="sr-only">Payables aging by supplier</caption>
                <thead>
                  <tr className="text-muted-foreground border-b text-xs">
                    <th scope="col" className="px-4 py-2 text-left font-medium">
                      Supplier
                    </th>
                    {cols.map((col) => (
                      <th key={col.label} scope="col" className="px-4 py-2 text-right font-medium">
                        {col.label}
                      </th>
                    ))}
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <tr key={row.vendorId}>
                      <th scope="row" className="px-4 py-3 text-left font-medium">
                        {row.vendorName}
                        <span className="text-muted-foreground block text-xs font-normal">
                          {row.bills} {row.bills === 1 ? "bill" : "bills"}
                        </span>
                      </th>
                      {cols.map((col) => (
                        <td key={col.label} className="px-4 py-3 text-right tabular-nums">
                          {col.pick(row) > 0 ? formatMinor(col.pick(row)) : ""}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatMinor(row.totalMinor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <th scope="row" className="px-4 py-3 text-left">
                      Total
                    </th>
                    {cols.map((col) => (
                      <td key={col.label} className="px-4 py-3 text-right tabular-nums">
                        {formatMinor(sum(col.pick))}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMinor(sum((row) => row.totalMinor))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
