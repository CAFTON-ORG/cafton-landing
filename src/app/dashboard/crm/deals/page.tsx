import type { Metadata } from "next";
import { Columns3, Plus, Table2 } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { SegmentedNav } from "@/components/dashboard/shared/segmented-nav";
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

  return (
    <>
      <PageHeader
        title="Deals"
        description="Every opportunity, from first contact to won or lost."
        action={newDeal}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SegmentedNav
          label="Deals view"
          items={[
            {
              href: "/dashboard/crm/deals",
              label: "Board",
              icon: Columns3,
              active: view === "board",
            },
            {
              href: "/dashboard/crm/deals?view=table",
              label: "Table",
              icon: Table2,
              active: view === "table",
            },
          ]}
        />
        {view === "board" && (
          <SegmentedNav
            label="Owner filter"
            items={[
              { href: "/dashboard/crm/deals", label: "Everyone", active: !mine },
              { href: "/dashboard/crm/deals?owner=me", label: "Mine", active: mine },
            ]}
          />
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
