import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Landmark, Upload } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { StatCard } from "@/components/dashboard/shared/stat-card";
import { Button } from "@/components/dashboard/ui/button";
import { BankLinesTable } from "@/features/finance/components/bank-lines-table";
import { ImportStatementDialog } from "@/features/finance/components/import-statement-dialog";
import { AutoMatchButton, SignOffCard } from "@/features/finance/components/reconcile-panels";
import {
  getBankAccount,
  listBankLines,
  listReconciliations,
} from "@/features/finance/bank-repository";
import { listPostableAccounts } from "@/features/finance/repository";
import { BANK_LINE_TABLE } from "@/features/finance/table";
import { addDays, manilaDate } from "@/features/schedule/slots";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import { parseTableParams, searchParamsFromRecord } from "@/lib/table-params";

export const metadata: Metadata = { title: "Bank account" };

export default async function BankAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("bank:view");
  if (!staff) return <AccessDenied area="the bank" />;

  const { id } = await params;
  const account = await getBankAccount(id);
  if (!account) notFound();

  const table = parseTableParams(searchParamsFromRecord(await searchParams), BANK_LINE_TABLE);
  const canManage = can(staff, "bank:manage");
  const canReconcile = can(staff, "bank:reconcile");
  const today = manilaDate(new Date());
  const [page, history, ledger] = await Promise.all([
    listBankLines(id, table),
    listReconciliations(id),
    canReconcile ? listPostableAccounts() : [],
  ]);

  return (
    <>
      <BackLink href="/dashboard/finance/bank">Bank</BackLink>
      <PageHeader
        title={account.name}
        description={`${account.accountName}${account.numberHint ? ` · ending ${account.numberHint}` : ""}`}
        action={
          <div className="flex flex-wrap gap-2">
            {canReconcile && (
              <AutoMatchButton bankAccountId={id} disabled={account.unmatchedCount === 0} />
            )}
            {canManage && account.active && (
              <ImportStatementDialog
                bankAccountId={id}
                trigger={
                  <Button>
                    <Upload aria-hidden="true" /> Import statement
                  </Button>
                }
              />
            )}
          </div>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="In the books"
          value={formatMinor(account.ledgerBalanceMinor)}
          icon={Landmark}
          hint="What the ledger says is in this account"
        />
        <StatCard
          label="To check"
          value={String(account.unmatchedCount)}
          icon={Landmark}
          hint={`of ${account.lineCount} statement ${account.lineCount === 1 ? "line" : "lines"}`}
        />
        <StatCard
          label="Signed off through"
          value={account.signedOffThrough ? formatDate(account.signedOffThrough) : "Not yet"}
          icon={Landmark}
          hint={
            account.lastImportAt
              ? `Last import ${formatDate(account.lastImportAt)}`
              : "Nothing imported yet"
          }
        />
      </div>

      <div className="grid gap-6">
        <BankLinesTable
          page={page}
          accounts={ledger.map((item) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            type: item.type,
          }))}
        />
        <SignOffCard
          bankAccountId={id}
          history={history}
          today={today}
          defaultStart={
            account.signedOffThrough ? addDays(account.signedOffThrough, 1) : addDays(today, -30)
          }
        />
      </div>
    </>
  );
}
