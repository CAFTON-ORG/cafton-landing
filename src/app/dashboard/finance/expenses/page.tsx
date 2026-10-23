import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Button } from "@/components/dashboard/ui/button";
import { ExpenseDialog } from "@/features/finance/components/expense-dialog";
import { ExpensesTable } from "@/features/finance/components/expenses-table";
import { countAwaitingApproval, listExpenses } from "@/features/finance/expense-repository";
import { listPostableAccounts } from "@/features/finance/repository";
import { EXPENSE_TABLE } from "@/features/finance/table";
import { manilaDate } from "@/features/schedule/slots";
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

  const params = parseTableParams(searchParamsFromRecord(await searchParams), EXPENSE_TABLE);
  const viewAll = can(staff, "expenses:view");
  const [page, accounts, waiting] = await Promise.all([
    listExpenses(params, { actorId: staff.id, viewAll }),
    listPostableAccounts(),
    viewAll ? countAwaitingApproval() : 0,
  ]);

  return (
    <>
      <PageHeader
        title="Expenses"
        description={
          viewAll
            ? `What people paid for the business. ${waiting > 0 ? `${waiting} waiting for your approval.` : "Nothing is waiting for approval."}`
            : "What you paid for the business. An approver checks each one before it goes in the books."
        }
        action={
          <ExpenseDialog
            today={manilaDate(new Date())}
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
      <ExpensesTable page={page} />
    </>
  );
}
