"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { useTableParams } from "@/components/dashboard/data-table/use-table-params";
import { StatusBadge, type StatusTone } from "@/components/dashboard/shared/status-badge";
import { formatDate } from "@/lib/format";
import type { Page } from "@/lib/pagination";
import type { BillRow } from "../payable-types";
import { BILL_STATE_LABEL, type BillState } from "../payables";
import { BILL_TABLE } from "../table";
import { DueHint } from "./due-hint";
import { Money } from "./money";

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

/** Bills as a list: number and supplier, status, due date (with how late), the total and what is still owed. */
export function BillsTable({ page, today }: { page: Page<BillRow>; today: string }) {
  const table = useTableParams(BILL_TABLE);
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
    {
      id: "state",
      header: "Status",
      hideBelow: "md",
      cell: (bill) => <BillStateBadge state={bill.state} />,
    },
    {
      id: "billed",
      header: "Bill date",
      hideBelow: "xl",
      cell: (bill) => formatDate(bill.billDate),
    },
    {
      id: "due",
      header: "Due",
      sortable: true,
      hideBelow: "sm",
      cell: (bill) => (
        <div>
          <p>{formatDate(bill.dueDate)}</p>
          <DueHint
            dueDate={bill.dueDate}
            today={today}
            owing={bill.status === "approved" && bill.balanceMinor > 0}
          />
        </div>
      ),
    },
    {
      id: "total",
      header: "Total",
      sortable: true,
      align: "right",
      hideBelow: "md",
      cell: (bill) => <Money minor={bill.totalMinor} />,
    },
    {
      id: "balance",
      header: "Balance due",
      align: "right",
      cell: (bill) =>
        bill.status === "approved" ? (
          <Money minor={bill.balanceMinor} bold={bill.balanceMinor > 0} muteZero />
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
      getRowId={(bill) => bill.id}
      caption="Bills"
      searchLabel="Search bills"
      searchPlaceholder="Search by number, supplier or their reference…"
      emptyIcon={Receipt}
      emptyTitle="No bills here"
      emptyDescription="Enter a bill when a supplier sends one, so it is owed in the books until you pay it."
    />
  );
}
