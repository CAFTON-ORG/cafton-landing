import type { Metadata } from "next";
import { CircleCheck } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import { receivablesAging } from "@/features/finance/repository/invoices";
import { manilaDate } from "@/features/schedule/rules/slots";
import { requirePageAccess } from "@/lib/auth/dal";
import { formatMinor } from "@/lib/money";

export const metadata: Metadata = { title: "Receivables" };

export default async function ReceivablesPage() {
  const staff = await requirePageAccess("invoices:view");
  if (!staff) return <AccessDenied area="receivables" />;

  const rows = await receivablesAging(manilaDate(new Date()));
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
      <PageHeader
        title="Receivables"
        description="What clients owe, by how late it is. The oldest money is the hardest to collect."
      />
      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState
              icon={CircleCheck}
              title="Nobody owes you anything"
              description="Issued invoices that are still unpaid appear here."
            />
          ) : (
            <div
              className="overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label="Aging by client, scrolls sideways"
            >
              <table className="w-full text-sm">
                <caption className="sr-only">Receivables aging by client</caption>
                <thead>
                  <tr className="text-muted-foreground border-b text-xs">
                    <th scope="col" className="px-4 py-2 text-left font-medium">
                      Client
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
                    <tr key={row.organizationId ?? row.clientName}>
                      <th scope="row" className="px-4 py-3 text-left font-medium">
                        {row.clientName}
                        <span className="text-muted-foreground block text-xs font-normal">
                          {row.invoices} {row.invoices === 1 ? "invoice" : "invoices"}
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
