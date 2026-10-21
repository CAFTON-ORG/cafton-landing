import type { Metadata } from "next";
import Link from "next/link";
import { Columns3, Plus, Table2 } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Button } from "@/components/dashboard/ui/button";
import { DealDialog } from "@/features/crm/components/deal-dialog";
import { DealsBoard } from "@/features/crm/components/deals-board";
import { DealsTable } from "@/features/crm/components/deals-table";
import { listContactOptions } from "@/features/crm/repository/contacts";
import { listBoardDeals, listDeals } from "@/features/crm/repository/deals";
import { listOrganizationOptions } from "@/features/crm/repository/organizations";
import { listStages, listStaffOptions } from "@/features/crm/repository/pipeline";
import { dealsTableConfig } from "@/features/crm/table";
import { actorId } from "@/lib/actions";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { parseTableParams, searchParamsFromRecord } from "@/lib/table-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Deals" };

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("deals:view");
  if (!staff) return <AccessDenied area="deals" />;

  const raw = await searchParams;
  const view = raw.view === "table" ? "table" : "board";
  const stages = await listStages();
  const params = parseTableParams(
    searchParamsFromRecord(raw),
    dealsTableConfig(stages.map((stage) => stage.key)),
  );
  const mine = params.filters.owner === "me";

  const [contacts, organizations, people] = await Promise.all([
    listContactOptions(),
    listOrganizationOptions(),
    listStaffOptions(),
  ]);

  const newDeal = can(staff, "deals:create") ? (
    <DealDialog
      contacts={contacts}
      organizations={organizations}
      people={people}
      trigger={
        <Button>
          <Plus aria-hidden="true" /> New deal
        </Button>
      }
    />
  ) : undefined;

  const tab = (active: boolean) =>
    cn(
      "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium",
      active
        ? "bg-background text-foreground shadow-xs"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <>
      <PageHeader
        title="Deals"
        description="Every opportunity, from first contact to won or lost."
        action={newDeal}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav aria-label="Deals view" className="bg-muted inline-flex rounded-lg p-0.5">
          <Link
            href="/dashboard/crm/deals"
            className={tab(view === "board")}
            aria-current={view === "board" ? "page" : undefined}
          >
            <Columns3 className="size-4" aria-hidden="true" /> Board
          </Link>
          <Link
            href="/dashboard/crm/deals?view=table"
            className={tab(view === "table")}
            aria-current={view === "table" ? "page" : undefined}
          >
            <Table2 className="size-4" aria-hidden="true" /> Table
          </Link>
        </nav>
        {view === "board" && (
          <nav aria-label="Owner filter" className="bg-muted inline-flex rounded-lg p-0.5">
            <Link
              href="/dashboard/crm/deals"
              className={tab(!mine)}
              aria-current={!mine ? "true" : undefined}
            >
              Everyone
            </Link>
            <Link
              href="/dashboard/crm/deals?owner=me"
              className={tab(mine)}
              aria-current={mine ? "true" : undefined}
            >
              Mine
            </Link>
          </nav>
        )}
      </div>

      {view === "board" ? (
        <DealsBoard stages={stages} deals={await listBoardDeals(params, actorId(staff))} />
      ) : (
        <DealsTable stages={stages} page={await listDeals(params, actorId(staff))} />
      )}
    </>
  );
}
