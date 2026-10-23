"use client";

import { useState } from "react";
import Link from "next/link";
import { Person } from "@/components/dashboard/shared/person";
import { Inbox } from "lucide-react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { useTableParams } from "@/components/dashboard/data-table/use-table-params";
import { UserAvatar } from "@/components/dashboard/shared/user-avatar";
import { formatRelative } from "@/lib/format";
import type { Page } from "@/lib/pagination";
import {
  Ago,
  BulkBar,
  NextStep,
  TagList,
  customColumns,
  customFilters,
  tagFilter,
} from "./list-parts";
import { SavedViews } from "./saved-views";
import { LEADS_TABLE } from "../table";
import type { PersonRef } from "../types";
import type { CustomFieldDef } from "../custom-fields";
import { LEAD_STATUSES, LEAD_STATUS_LABEL, type LeadView } from "../types";
import { LEAD_BANDS, LEAD_BAND_LABEL } from "../scoring";
import { LeadScoreBadge, LeadStatusBadge } from "./badges";

const baseColumns: Column<LeadView>[] = [
  {
    id: "name",
    header: "Enquiry",
    sortable: true,
    cell: (lead) => (
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar name={lead.name} className="shrink-0" />
        <div className="min-w-0">
          <Link
            href={`/dashboard/crm/leads/${lead.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {lead.name}
          </Link>
          <p className="text-muted-foreground truncate text-xs">
            {lead.reference} · {lead.businessName ?? lead.email}
          </p>
        </div>
      </div>
    ),
  },
  { id: "goals", header: "Interested in", hideBelow: "md", cell: (lead) => lead.goalsArea ?? "—" },
  { id: "budget", header: "Budget", hideBelow: "lg", cell: (lead) => lead.budget ?? "—" },
  {
    id: "status",
    header: "Status",
    sortable: true,
    cell: (lead) => <LeadStatusBadge status={lead.status} />,
  },
  {
    id: "score",
    header: "Score",
    sortable: true,
    hideBelow: "md",
    cell: (lead) => <LeadScoreBadge score={lead.score} band={lead.scoreBand} />,
  },
  {
    id: "owner",
    header: "Owner",
    hideBelow: "lg",
    cell: (lead) => <Person name={lead.ownerName} avatarUrl={lead.ownerAvatar} />,
  },
  {
    id: "created",
    header: "Received",
    sortable: true,
    hideBelow: "sm",
    cell: (lead) => (
      <time dateTime={lead.createdAt} className="text-muted-foreground">
        {formatRelative(lead.createdAt)}
      </time>
    ),
  },
  {
    id: "tags",
    header: "Tags",
    hideBelow: "xl",
    cell: (row) => <TagList tags={row.tags} />,
  },
  {
    id: "last",
    header: "Last contact",
    hideBelow: "xl",
    cell: (row) => <Ago at={row.lastContactedAt} />,
  },
  {
    id: "next",
    header: "Next step",
    hideBelow: "lg",
    cell: (row) => <NextStep at={row.nextActivityAt} />,
  },
];

export function LeadsTable({
  customFields,
  page,
  people,
  tagOptions,
}: {
  customFields: CustomFieldDef[];
  page: Page<LeadView>;
  people: PersonRef[];
  tagOptions: string[];
}) {
  const table = useTableParams(LEADS_TABLE);
  const columns = [...baseColumns, ...customColumns<LeadView>(customFields)];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  return (
    <ResourceTable
      table={table}
      page={page}
      columns={columns}
      getRowId={(lead) => lead.id}
      caption="Website enquiries"
      searchLabel="Search leads"
      searchPlaceholder="Search leads…"
      actions={<SavedViews resource="leads" />}
      selection={{ selected, onChange: setSelected }}
      bulkBar={
        <BulkBar
          kind="lead"
          ids={[...selected]}
          people={people}
          tagSuggestions={tagOptions}
          onDone={() => setSelected(new Set())}
        />
      }
      filters={[
        {
          id: "status",
          label: "Status",
          allLabel: "All statuses",
          options: LEAD_STATUSES.map((status) => ({
            value: status,
            label: LEAD_STATUS_LABEL[status],
          })),
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
        {
          id: "band",
          label: "Score",
          allLabel: "Any score",
          options: LEAD_BANDS.map((band) => ({ value: band, label: LEAD_BAND_LABEL[band] })),
        },
        ...tagFilter(tagOptions),
        ...customFilters(customFields),
      ]}
      emptyIcon={Inbox}
      emptyTitle="No enquiries yet"
      emptyDescription="When someone fills in the contact form on the website, their enquiry lands here."
    />
  );
}
