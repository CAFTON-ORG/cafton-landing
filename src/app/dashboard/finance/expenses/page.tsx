import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Button } from "@/components/dashboard/ui/button";
import { ExpenseDialog } from "@/features/finance/components/expense-dialog";
import { ExpensesTable } from "@/features/finance/components/expenses-table";
import { StatusTabs } from "@/features/finance/components/status-tabs";
import { SummaryStrip, plural } from "@/features/finance/components/summary-strip";
import { expenseSummary, listExpenses } from "@/features/finance/repository/expenses";
import { listPostableAccounts } from "@/features/finance/repository/ledger";
import { EXPENSE_TABLE } from "@/features/finance/table";
import { manilaDate } from "@/features/schedule/rules/slots";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { parseTableParams, searchParamsFromRecord } from "@/lib/table-params";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("expenses:submit");
  if (!staff) return <AccessDenied area="expenses" />;

  const today = manilaDate(new Date());
  const params = parseTableParams(searchParamsFromRecord(await searchParams), EXPENSE_TABLE);
  const viewAll = can(staff, "expenses:view");
  const scope = { actorId: staff.id, viewAll };
  const [page, summary, accounts] = await Promise.all([
    listExpenses(params, scope),
    expenseSummary(scope, today),
    listPostableAccounts(),
  ]);

  return (
    <>
      <PageHeader
        title="Expenses"
        description={
          viewAll
            ? "What people paid for the business. An approver checks each one before it goes in the books."
            : "What you paid for the business. An approver checks each one before it goes in the books."
        }
        action={
          <ExpenseDialog
            today={today}
            costAccounts={accounts.filter(
              (account) => account.type === "expense" || account.type === "asset",
            )}
            paidFromAccounts={accounts.filter(
              (account) => account.type === "asset" || account.systemKey === "reimbursable",
            )}
            trigger={
              <Button>
                <Plus aria-hidden="true" /> New expense
              </Button>
            }
          />
        }
      />
      <SummaryStrip
        items={[
          {
            label: "Waiting for approval",
            amountMinor: summary.waiting.amountMinor,
            detail: plural(summary.waiting.count, "expense"),
            href: "/dashboard/finance/expenses?status=submitted",
            tone: summary.waiting.count > 0 ? "warning" : "neutral",
          },
          {
            label: "Approved this month",
            amountMinor: summary.approvedThisMonth.amountMinor,
            detail: plural(summary.approvedThisMonth.count, "expense"),
            href: "/dashboard/finance/expenses?status=approved",
            tone: "success",
          },
          {
            label: "Sent back to fix",
            amountMinor: summary.sentBack.amountMinor,
            detail: plural(summary.sentBack.count, "expense"),
            href: "/dashboard/finance/expenses?status=rejected",
            tone: summary.sentBack.count > 0 ? "danger" : "neutral",
          },
        ]}
      />
      <StatusTabs
        param="status"
        label="Expense status"
        tabs={[
          { value: "", label: "All", count: summary.counts.all },
          { value: "submitted", label: "Waiting for approval", count: summary.counts.submitted },
          { value: "approved", label: "Approved", count: summary.counts.approved },
          { value: "rejected", label: "Sent back", count: summary.counts.rejected },
          { value: "void", label: "Void", count: summary.counts.void },
        ]}
      />
      <ExpensesTable page={page} />
    </>
  );
}
