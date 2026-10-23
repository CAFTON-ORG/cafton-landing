import { listCustomFields } from "@/features/crm/repository/custom-fields";
import type { Metadata } from "next";
import { ExportButton } from "@/features/crm/components/export-button";
import { Columns3, Plus, Table2 } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { SegmentedNav } from "@/components/dashboard/shared/segmented-nav";
import { Button } from "@/components/dashboard/ui/button";
import { DealDialog } from "@/features/crm/components/deal-dialog";
import { DealsBoard } from "@/features/crm/components/deals-board";
import { DealsTable } from "@/features/crm/components/deals-table";
import { listContactOptions } from "@/features/crm/repository/contacts";
import { listTagOptions } from "@/features/crm/repository/tags";
import { listBoardDeals, listDeals } from "@/features/crm/repository/deals";
import { listOrganizationOptions } from "@/features/crm/repository/organizations";
import { listPipelines, listStaffOptions } from "@/features/crm/repository/pipeline";
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
  const mine = raw.owner === "me";
  const pipelines = await listPipelines();
  const pipeline = pipelines.find((item) => item.key === raw.pipeline) ?? pipelines[0];
  const stages = pipeline?.stages ?? [];
  const params = parseTableParams(
    searchParamsFromRecord(raw),
    dealsTableConfig(stages.map((stage) => stage.key)),
  );
  // The board and table show one pipeline at a time.
  if (pipeline) params.filters.pipeline = pipeline.key;
  const href = (patch: Record<string, string | null>) => {
    const query = new URLSearchParams();
    const current: Record<string, string | null> = {
      view: view === "table" ? "table" : null,
      pipeline: pipeline && !pipeline.isDefault ? pipeline.key : null,
      owner: mine ? "me" : null,
      ...patch,
    };
    for (const [key, value] of Object.entries(current)) if (value) query.set(key, value);
    const text = query.toString();
    return text ? `/dashboard/crm/deals?${text}` : "/dashboard/crm/deals";
  };
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
      pipelines={pipelines.map((item) => ({ id: item.id, name: item.name }))}
      defaultPipelineId={pipeline?.id}
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
        action={
          <div className="flex flex-wrap gap-2">
            {view === "table" && <ExportButton kind="deals" />}
            {newDeal}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {pipelines.length > 1 && (
          <SegmentedNav
            label="Pipeline"
            items={pipelines.map((item) => ({
              href: href({ pipeline: item.isDefault ? null : item.key }),
              label: item.name,
              active: item.id === pipeline?.id,
            }))}
          />
        )}
        <SegmentedNav
          label="Deals view"
          items={[
            {
              href: href({ view: null }),
              label: "Board",
              icon: Columns3,
              active: view === "board",
            },
            {
              href: href({ view: "table" }),
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
              { href: href({ owner: null }), label: "Everyone", active: !mine },
              { href: href({ owner: "me" }), label: "Mine", active: mine },
            ]}
          />
        )}
      </div>

      {view === "board" ? (
        <DealsBoard stages={stages} deals={await listBoardDeals(params, actorId(staff))} />
      ) : (
        <DealsTable
          customFields={await listCustomFields("deal")}
          stages={stages}
          page={await listDeals(params, actorId(staff))}
          people={people}
          tagOptions={await listTagOptions("deal")}
        />
      )}
    </>
  );
}
