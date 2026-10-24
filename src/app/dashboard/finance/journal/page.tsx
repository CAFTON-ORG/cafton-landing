import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Button } from "@/components/dashboard/ui/button";
import { EntryDialog } from "@/features/finance/components/entry-dialog";
import { JournalTable } from "@/features/finance/components/journal-table";
import { listJournal, listPostableAccounts } from "@/features/finance/repository/ledger";
import { JOURNAL_TABLE } from "@/features/finance/rules/table";
import { manilaDate } from "@/features/schedule/rules/slots";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { parseTableParams, searchParamsFromRecord } from "@/lib/table-params";

export const metadata: Metadata = { title: "Journal" };

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("finance:view");
  if (!staff) return <AccessDenied area="the books" />;

  const params = parseTableParams(searchParamsFromRecord(await searchParams), JOURNAL_TABLE);
  const canPost = can(staff, "finance:post");
  const [page, accounts] = await Promise.all([
    listJournal(params),
    canPost ? listPostableAccounts() : [],
  ]);

  return (
    <>
      <PageHeader
        title="Journal"
        description="Every posting, oldest or newest first. Invoices, payments and bills post themselves; entries typed in by hand are for what they don't cover."
        action={
          canPost ? (
            <EntryDialog
              accounts={accounts}
              today={manilaDate(new Date())}
              trigger={
                <Button>
                  <Plus aria-hidden="true" /> New journal entry
                </Button>
              }
            />
          ) : undefined
        }
      />
      <JournalTable page={page} />
    </>
  );
}
