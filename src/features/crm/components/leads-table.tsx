"use client";

import Link from "next/link";
import { Inbox } from "lucide-react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { formatRelative } from "@/lib/format";
import type { Page } from "@/lib/pagination";
import { LEADS_TABLE } from "../table";
import { LEAD_STATUSES, LEAD_STATUS_LABEL, type LeadView } from "../types";
import { LeadStatusBadge } from "./badges";

const columns: Column<LeadView>[] = [
  {
    id: "name",
    header: "Enquiry",
    sortable: true,
    cell: (lead) => (
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
    id: "owner",
    header: "Owner",
    hideBelow: "lg",
    cell: (lead) => lead.ownerName ?? <span className="text-muted-foreground">Unassigned</span>,
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
];

export function LeadsTable({ page }: { page: Page<LeadView> }) {
  return (
    <ResourceTable
      config={LEADS_TABLE}
      page={page}
      columns={columns}
      getRowId={(lead) => lead.id}
      caption="Website enquiries"
      searchLabel="Search leads"
      searchPlaceholder="Search leads…"
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
      ]}
      emptyIcon={Inbox}
      emptyTitle="No enquiries yet"
      emptyDescription="When someone fills in the contact form on the website, their enquiry lands here."
    />
  );
}
