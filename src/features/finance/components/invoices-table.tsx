"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { useTableParams } from "@/components/dashboard/data-table/use-table-params";
import { formatDate } from "@/lib/format";
import type { Page } from "@/lib/pagination";
import type { InvoiceRow } from "../types/invoices";
import { INVOICE_TABLE } from "../table";
import { DueHint } from "./due-hint";
import { InvoiceStateBadge } from "./invoice-state-badge";
import { Money } from "./money";

/** Invoices as a list: number and client, status, dates (with how late), the total and what is still owed. */
export function InvoicesTable({ page, today }: { page: Page<InvoiceRow>; today: string }) {
  const table = useTableParams(INVOICE_TABLE);
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
          <p className="text-muted-foreground line-clamp-1 text-xs">
            {invoice.clientName}
            {invoice.projectName ? ` · ${invoice.projectName}` : ""}
          </p>
        </div>
      ),
    },
    {
      id: "state",
      header: "Status",
      hideBelow: "md",
      cell: (invoice) => <InvoiceStateBadge state={invoice.state} />,
    },
    {
      id: "issued",
      header: "Issued",
      hideBelow: "xl",
      cell: (invoice) => (invoice.issueDate ? formatDate(invoice.issueDate) : ""),
    },
    {
      id: "due",
      header: "Due",
      sortable: true,
      hideBelow: "sm",
      cell: (invoice) =>
        invoice.dueDate ? (
          <div>
            <p>{formatDate(invoice.dueDate)}</p>
            <DueHint
              dueDate={invoice.dueDate}
              today={today}
              owing={invoice.status === "issued" && invoice.balanceMinor > 0}
            />
          </div>
        ) : (
          ""
        ),
    },
    {
      id: "total",
      header: "Total",
      sortable: true,
      align: "right",
      hideBelow: "md",
      cell: (invoice) => <Money minor={invoice.totalMinor} />,
    },
    {
      id: "balance",
      header: "Balance due",
      align: "right",
      cell: (invoice) =>
        invoice.status === "issued" ? (
          <Money minor={invoice.balanceMinor} bold={invoice.balanceMinor > 0} muteZero />
        ) : (
          <span className="text-muted-foreground">·</span>
        ),
    },
  ];
  return (
    <ResourceTable
      table={table}
      page={page}
      columns={columns}
      getRowId={(invoice) => invoice.id}
      caption="Invoices"
      searchLabel="Search invoices"
      searchPlaceholder="Search by number, client or project…"
      emptyIcon={FileText}
      emptyTitle="No invoices here"
      emptyDescription="Start one from an accepted quote, a finished milestone, approved time, or a blank draft."
    />
  );
}
