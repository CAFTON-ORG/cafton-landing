"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { useTableParams } from "@/components/dashboard/data-table/use-table-params";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import type { Page } from "@/lib/pagination";
import type { InvoiceRow } from "../invoice-types";
import { INVOICE_STATE_LABEL } from "../invoicing";
import { INVOICE_STATES, INVOICE_TABLE } from "../table";
import { InvoiceStateBadge } from "./invoice-state-badge";

const columns: Column<InvoiceRow>[] = [
  {
    id: "number",
    header: "Invoice",
    sortable: true,
    cell: (invoice) => (
      <div className="min-w-0">
        <Link
          href={`/dashboard/finance/invoices/${invoice.id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {invoice.number ?? "Draft"}
        </Link>
        <p className="text-muted-foreground line-clamp-1 text-xs">{invoice.clientName}</p>
      </div>
    ),
  },
  {
    id: "state",
    header: "Status",
    cell: (invoice) => <InvoiceStateBadge state={invoice.state} />,
  },
  {
    id: "project",
    header: "Project",
    hideBelow: "lg",
    cell: (invoice) => (
      <span className="text-muted-foreground">{invoice.projectName ?? "None"}</span>
    ),
  },
  {
    id: "due",
    header: "Due",
    sortable: true,
    hideBelow: "md",
    cell: (invoice) => (invoice.dueDate ? formatDate(invoice.dueDate) : "None"),
  },
  {
    id: "total",
    header: "Total",
    sortable: true,
    cell: (invoice) => <span className="tabular-nums">{formatMinor(invoice.totalMinor)}</span>,
  },
  {
    id: "balance",
    header: "Balance",
    hideBelow: "sm",
    cell: (invoice) => (
      <span className="tabular-nums">
        {invoice.status === "issued" ? formatMinor(invoice.balanceMinor) : "None"}
      </span>
    ),
  },
];

export function InvoicesTable({ page }: { page: Page<InvoiceRow> }) {
  const table = useTableParams(INVOICE_TABLE);
  return (
    <ResourceTable
      table={table}
      page={page}
      columns={columns}
      getRowId={(invoice) => invoice.id}
      caption="Invoices"
      searchLabel="Search invoices"
      searchPlaceholder="Search by number, client or project…"
      filters={[
        {
          id: "state",
          label: "Status",
          allLabel: "Any status",
          options: INVOICE_STATES.map((state) => ({
            value: state,
            label: INVOICE_STATE_LABEL[state],
          })),
        },
      ]}
      emptyIcon={FileText}
      emptyTitle="No invoices yet"
      emptyDescription="Start one from an accepted quote, a finished milestone, or a blank draft."
    />
  );
}
