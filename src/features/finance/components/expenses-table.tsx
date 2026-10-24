"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { useTableParams } from "@/components/dashboard/data-table/use-table-params";
import { StatusBadge, type StatusTone } from "@/components/dashboard/shared/status-badge";
import { formatDate } from "@/lib/format";
import type { Page } from "@/lib/pagination";
import type { ExpenseRow } from "../types/expenses";
import { EXPENSE_STATUS_LABEL, type ExpenseStatus } from "../rules/expenses";
import { EXPENSE_TABLE } from "../table";
import { Money } from "./money";

const TONE: Record<ExpenseStatus, StatusTone> = {
  submitted: "warning",
  approved: "success",
  rejected: "danger",
  void: "neutral",
};

export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  return <StatusBadge tone={TONE[status]}>{EXPENSE_STATUS_LABEL[status]}</StatusBadge>;
}

const columns: Column<ExpenseRow>[] = [
  {
    id: "description",
    header: "Expense",
    cell: (expense) => (
      <div className="min-w-0">
        <Link
          href={`/dashboard/finance/expenses/${expense.id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {expense.description}
        </Link>
        <p className="text-muted-foreground line-clamp-1 text-xs">
          {expense.payee}
          {expense.number ? ` · ${expense.number}` : ""}
        </p>
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: (expense) => <ExpenseStatusBadge status={expense.status} />,
  },
  {
    id: "date",
    header: "Date",
    sortable: true,
    hideBelow: "md",
    cell: (expense) => formatDate(expense.expenseDate),
  },
  {
    id: "by",
    header: "Submitted by",
    hideBelow: "lg",
    cell: (expense) => <span className="text-muted-foreground">{expense.submittedByName}</span>,
  },
  {
    id: "receipts",
    header: "Receipts",
    hideBelow: "lg",
    cell: (expense) => (
      <span className="text-muted-foreground tabular-nums">{expense.receiptCount}</span>
    ),
  },
  {
    id: "amount",
    header: "Amount",
    sortable: true,
    align: "right",
    cell: (expense) => <Money minor={expense.amountMinor} />,
  },
];

export function ExpensesTable({ page }: { page: Page<ExpenseRow> }) {
  const table = useTableParams(EXPENSE_TABLE);
  return (
    <ResourceTable
      table={table}
      page={page}
      columns={columns}
      getRowId={(expense) => expense.id}
      caption="Expenses"
      searchLabel="Search expenses"
      searchPlaceholder="Search by what it was for, who was paid or who submitted it…"
      emptyIcon={Receipt}
      emptyTitle="No expenses yet"
      emptyDescription="Paid for something for the business? Submit it with the receipt and it is approved into the books."
    />
  );
}
