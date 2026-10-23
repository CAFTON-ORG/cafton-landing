"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { useTableParams } from "@/components/dashboard/data-table/use-table-params";
import { StatusBadge, type StatusTone } from "@/components/dashboard/shared/status-badge";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import type { Page } from "@/lib/pagination";
import type { BillRow } from "../payable-types";
import { BILL_STATE_LABEL, type BillState } from "../payables";
import { BILL_STATES, BILL_TABLE } from "../table";

const TONE: Record<BillState, StatusTone> = {
  draft: "neutral",
  void: "neutral",
  open: "info",
  partial: "warning",
  overdue: "danger",
  paid: "success",
};

export function BillStateBadge({ state }: { state: BillState }) {
  return <StatusBadge tone={TONE[state]}>{BILL_STATE_LABEL[state]}</StatusBadge>;
}

const columns: Column<BillRow>[] = [
  {
    id: "number",
    header: "Bill",
    sortable: true,
    cell: (bill) => (
      <div className="min-w-0">
        <Link
          href={`/dashboard/finance/bills/${bill.id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {bill.number ?? "Draft"}
        </Link>
        <p className="text-muted-foreground line-clamp-1 text-xs">
          {bill.vendorName}
          {bill.vendorRef ? ` · ${bill.vendorRef}` : ""}
        </p>
      </div>
    ),
  },
  { id: "state", header: "Status", cell: (bill) => <BillStateBadge state={bill.state} /> },
  {
    id: "due",
    header: "Due",
    sortable: true,
    hideBelow: "md",
    cell: (bill) => formatDate(bill.dueDate),
  },
  {
    id: "total",
    header: "Total",
    sortable: true,
    cell: (bill) => <span className="tabular-nums">{formatMinor(bill.totalMinor)}</span>,
  },
  {
    id: "balance",
    header: "Balance",
    hideBelow: "sm",
    cell: (bill) => (
      <span className="tabular-nums">
        {bill.status === "approved" ? formatMinor(bill.balanceMinor) : "None"}
      </span>
    ),
  },
];

export function BillsTable({ page }: { page: Page<BillRow> }) {
  const table = useTableParams(BILL_TABLE);
  return (
    <ResourceTable
      table={table}
      page={page}
      columns={columns}
      getRowId={(bill) => bill.id}
      caption="Bills"
      searchLabel="Search bills"
      searchPlaceholder="Search by number, supplier or their reference…"
      filters={[
        {
          id: "state",
          label: "Status",
          allLabel: "Any status",
          options: BILL_STATES.map((state) => ({ value: state, label: BILL_STATE_LABEL[state] })),
        },
      ]}
      emptyIcon={Receipt}
      emptyTitle="No bills yet"
      emptyDescription="Enter a bill when a supplier sends one, so it is owed in the books until you pay it."
    />
  );
}
