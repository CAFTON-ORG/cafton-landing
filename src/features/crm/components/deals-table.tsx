"use client";

import { useState } from "react";
import Link from "next/link";
import { Person } from "@/components/dashboard/shared/person";
import { Building2, Handshake } from "lucide-react";
import { useMemo } from "react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { useTableParams } from "@/components/dashboard/data-table/use-table-params";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import { Thumbnail } from "@/components/dashboard/shared/thumbnail";
import { UserAvatar } from "@/components/dashboard/shared/user-avatar";
import type { Page } from "@/lib/pagination";
import { BulkBar, NextStep, TagList, customColumns, customFilters, tagFilter } from "./list-parts";
import { SavedViews } from "./saved-views";
import { dealsTableConfig } from "../table";
import type { DealView, PersonRef, StageView } from "../types";
import type { CustomFieldDef } from "../custom-fields";
import { StageBadge } from "./badges";

const baseColumns: Column<DealView>[] = [
  {
    id: "title",
    header: "Deal",
    sortable: true,
    cell: (deal) => (
      <div className="flex min-w-0 items-center gap-3">
        {deal.organizationName ? (
          <Thumbnail icon={Building2} />
        ) : (
          <UserAvatar name={deal.contactName ?? deal.title} className="shrink-0" />
        )}
        <div className="min-w-0">
          <Link
            href={`/dashboard/crm/deals/${deal.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {deal.title}
          </Link>
          <p className="text-muted-foreground truncate text-xs">
            {deal.reference} · {deal.organizationName ?? deal.contactName}
          </p>
        </div>
      </div>
    ),
  },
  { id: "stage", header: "Stage", sortable: true, cell: (deal) => <StageBadge deal={deal} /> },
  {
    id: "amount",
    header: "Value",
    sortable: true,
    align: "right",
    cell: (deal) => (
      <span className="tabular-nums">
        {formatMinor(deal.amountMinor, deal.currency, { compact: true })}
      </span>
    ),
  },
  {
    id: "owner",
    header: "Owner",
    hideBelow: "lg",
    cell: (deal) => <Person name={deal.ownerName} avatarUrl={deal.ownerAvatar} />,
  },
  {
    id: "tags",
    header: "Tags",
    hideBelow: "xl",
    cell: (row) => <TagList tags={row.tags} />,
  },
  {
    id: "next",
    header: "Next step",
    hideBelow: "lg",
    cell: (row) => <NextStep at={row.nextActivityAt} closed={row.stageKind !== "open"} />,
  },
  {
    id: "close",
    header: "Expected close",
    sortable: true,
    hideBelow: "md",
    cell: (deal) =>
      deal.expectedCloseDate ? (
        formatDate(deal.expectedCloseDate)
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export function DealsTable({
  customFields,
  page,
  stages,
  actions,
  people,
  tagOptions,
}: {
  customFields: CustomFieldDef[];
  page: Page<DealView>;
  stages: StageView[];
  actions?: React.ReactNode;
  people: PersonRef[];
  tagOptions: string[];
}) {
  const stageKeys = stages.map((stage) => stage.key).join(",");
  const config = useMemo(
    () => dealsTableConfig(stageKeys ? stageKeys.split(",") : []),
    [stageKeys],
  );

  const table = useTableParams(config);
  const columns = [...baseColumns, ...customColumns<DealView>(customFields)];
  const [selected, setSelected] = useState<Set<string>>(new Set());

  return (
    <ResourceTable
      table={table}
      page={page}
      columns={columns}
      getRowId={(deal) => deal.id}
      caption="Deals"
      searchLabel="Search deals"
      searchPlaceholder="Search deals…"
      filters={[
        {
          id: "stage",
          label: "Stage",
          allLabel: "All stages",
          options: stages.map((stage) => ({ value: stage.key, label: stage.name })),
        },
        {
          id: "owner",
          label: "Owner",
          allLabel: "Anyone",
          options: [
            { value: "me", label: "Mine" },
            { value: "unassigned", label: "Unassigned" },
          ],
        },
        ...tagFilter(tagOptions),
        ...customFilters(customFields),
      ]}
      actions={
        <>
          <SavedViews resource="deals" />
          {actions}
        </>
      }
      selection={{ selected, onChange: setSelected }}
      bulkBar={
        <BulkBar
          kind="deal"
          ids={[...selected]}
          people={people}
          tagSuggestions={tagOptions}
          onDone={() => setSelected(new Set())}
        />
      }

      emptyIcon={Handshake}
      emptyTitle="No deals yet"
      emptyDescription="Convert a lead or create a deal to start building the pipeline."
    />
  );
}
