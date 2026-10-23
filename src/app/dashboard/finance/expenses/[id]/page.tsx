import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import {
  ActivityTimeline,
  DocumentSummary,
  type ActivityItem,
} from "@/features/finance/components/document-summary";
import { ExpenseActions, ReceiptsCard } from "@/features/finance/components/expense-actions";
import { ExpenseDialog } from "@/features/finance/components/expense-dialog";
import { ExpenseStatusBadge } from "@/features/finance/components/expenses-table";
import { getExpense } from "@/features/finance/expense-repository";
import { RECEIPT_REQUIRED_OVER_MINOR } from "@/features/finance/expenses";
import { listPostableAccounts } from "@/features/finance/repository";
import { manilaDate } from "@/features/schedule/slots";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Expense" };

export default async function ExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("expenses:submit");
  if (!staff) return <AccessDenied area="expenses" />;

  const { id } = await params;
  const expense = await getExpense(id);
  if (!expense) notFound();

  const isApprover = can(staff, "expenses:approve");
  const isOwner = expense.submittedBy === staff.id;
  // Other people's expenses are for approvers; someone who can only submit sees their own.
  if (!isOwner && !can(staff, "expenses:view")) notFound();

  const open = expense.status === "submitted" || expense.status === "rejected";
  const canEdit = isOwner && open;
  const canChangeReceipts = open && (isOwner || isApprover);
  const accounts = canEdit ? await listPostableAccounts() : [];
  const today = manilaDate(new Date());

  const history: ActivityItem[] = [
    {
      at: expense.createdAt,
      text: `Submitted by ${expense.submittedByName}`,
    },
    ...(expense.status === "approved" || expense.status === "void"
      ? expense.decidedAt
        ? [
            {
              at: expense.decidedAt,
              text: `Approved by ${expense.decidedByName ?? "an approver"} as ${expense.number}`,
              tone: "success" as const,
            },
          ]
        : []
      : []),
    ...(expense.status === "rejected" && expense.decidedAt
      ? [
          {
            at: expense.decidedAt,
            text: `Sent back by ${expense.decidedByName ?? "an approver"}`,
            detail: expense.rejectReason,
            tone: "danger" as const,
          },
        ]
      : []),
    ...(expense.voidedAt
      ? [
          {
            at: expense.voidedAt,
            text: "Voided",
            detail: expense.voidReason,
            tone: "danger" as const,
          },
        ]
      : []),
  ];

  return (
    <>
      <BackLink href="/dashboard/finance/expenses">Expenses</BackLink>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{expense.description}</h1>
            <ExpenseStatusBadge status={expense.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            {expense.payee}
            {expense.number && ` · ${expense.number}`} · submitted by {expense.submittedByName}
          </p>
        </div>
        <ExpenseActions
          id={expense.id}
          number={expense.number}
          status={expense.status}
          isApprover={isApprover}
          canWithdraw={open && (isOwner || isApprover)}
          editor={
            canEdit ? (
              <ExpenseDialog
                today={today}
                expense={expense}
                costAccounts={accounts.filter(
                  (account) => account.type === "expense" || account.type === "asset",
                )}
                paidFromAccounts={accounts.filter(
                  (account) => account.type === "asset" || account.systemKey === "reimbursable",
                )}
                trigger={
                  <Button variant="outline">
                    <Pencil aria-hidden="true" /> Edit
                  </Button>
                }
              />
            ) : undefined
          }
        />
      </div>

      {expense.status === "rejected" && (
        <Card className="mb-4">
          <CardContent className="text-sm">
            Sent back by {expense.decidedByName}
            {expense.decidedAt ? ` on ${formatDate(expense.decidedAt)}` : ""}:{" "}
            {expense.rejectReason}
            {isOwner && " Edit it and it goes back for approval."}
          </CardContent>
        </Card>
      )}
      {expense.status === "void" && (
        <Card className="mb-4">
          <CardContent className="text-sm">
            Voided {expense.voidedAt ? formatDate(expense.voidedAt) : ""}: {expense.voidReason}
          </CardContent>
        </Card>
      )}

      <DocumentSummary
        label="Amount"
        amountMinor={expense.amountMinor}
        facts={[
          { label: "Date paid", value: formatDate(expense.expenseDate) },
          { label: "Category", value: expense.accountName },
          { label: "Paid from", value: expense.paidFromName },
          { label: "Receipts", value: String(expense.receipts.length) },
        ]}
      />

      <div className="grid gap-4">
        <ReceiptsCard
          expenseId={expense.id}
          receipts={expense.receipts}
          canChange={canChangeReceipts}
          required={expense.amountMinor > RECEIPT_REQUIRED_OVER_MINOR}
        />

        {expense.notes && (
          <Card>
            <CardContent className="text-sm whitespace-pre-line">{expense.notes}</CardContent>
          </Card>
        )}

        <ActivityTimeline items={history} />

        {expense.journalEntryId && (
          <p className="text-muted-foreground text-sm">
            Posted to the books as{" "}
            <Link
              className="underline underline-offset-4"
              href={`/dashboard/finance/journal/${expense.journalEntryId}`}
            >
              a journal entry
            </Link>
            .
          </p>
        )}
      </div>
    </>
  );
}
