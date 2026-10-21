"use client";

import Link from "next/link";
import { Handshake } from "lucide-react";
import { useMemo } from "react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import type { Page } from "@/lib/pagination";
import { dealsTableConfig } from "../table";
import type { DealView, StageView } from "../types";
import { StageBadge } from "./badges";

const columns: Column<DealView>[] = [
  {
    id: "title",
    header: "Deal",
    sortable: true,
    cell: (deal) => (
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
    cell: (deal) => deal.ownerName ?? <span className="text-muted-foreground">Unassigned</span>,
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
  page,
  stages,
  actions,
}: {
  page: Page<DealView>;
  stages: StageView[];
  actions?: React.ReactNode;
}) {
  const stageKeys = stages.map((stage) => stage.key).join(",");
  const config = useMemo(
    () => dealsTableConfig(stageKeys ? stageKeys.split(",") : []),
    [stageKeys],
  );

  return (
    <ResourceTable
      config={config}
      page={page}
      columns={columns}
      getRowId={(deal) => deal.id}
      caption="Deals"
      searchLabel="Search deals"
      searchPlaceholder="Search title, reference, contact or organization…"
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
      ]}
      actions={actions}
      emptyIcon={Handshake}
      emptyTitle="No deals yet"
      emptyDescription="Convert a lead or create a deal to start building the pipeline."
    />
  );
}
