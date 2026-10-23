"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { useTableParams } from "@/components/dashboard/data-table/use-table-params";
import { useCan } from "@/components/dashboard/layout/staff-context";
import { Button } from "@/components/dashboard/ui/button";
import { Thumbnail } from "@/components/dashboard/shared/thumbnail";
import type { Page } from "@/lib/pagination";
import { BulkBar, TagList, customColumns, customFilters, tagFilter } from "./list-parts";
import { SavedViews } from "./saved-views";
import { ORGANIZATIONS_TABLE } from "../table";
import type { OrganizationView } from "../types";
import type { CustomFieldDef } from "../custom-fields";
import { OrganizationDialog } from "./organization-dialog";

const baseColumns: Column<OrganizationView>[] = [
  {
    id: "name",
    header: "Organization",
    sortable: true,
    cell: (org) => (
      <div className="flex min-w-0 items-center gap-3">
        <Thumbnail icon={Building2} />
        <div className="min-w-0">
          <Link
            href={`/dashboard/crm/organizations/${org.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {org.name}
          </Link>
          {org.industry && <p className="text-muted-foreground truncate text-xs">{org.industry}</p>}
        </div>
      </div>
    ),
  },
  { id: "industry", header: "Industry", hideBelow: "sm", cell: (org) => org.industry ?? "—" },
  {
    id: "contacts",
    header: "Contacts",
    hideBelow: "md",
    align: "right",
    cell: (org) => org.contactCount,
  },
  {
    id: "tags",
    header: "Tags",
    hideBelow: "xl",
    cell: (row) => <TagList tags={row.tags} />,
  },
  { id: "deals", header: "Deals", hideBelow: "md", align: "right", cell: (org) => org.dealCount },
];

export function OrganizationsTable({
  customFields,
  page,
  tagOptions,
}: {
  customFields: CustomFieldDef[];
  page: Page<OrganizationView>;
  tagOptions: string[];
}) {
  const table = useTableParams(ORGANIZATIONS_TABLE);
  const columns = [...baseColumns, ...customColumns<OrganizationView>(customFields)];
  const canCreate = useCan("organizations:create");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const add = (
    <OrganizationDialog
      trigger={
        <Button>
          <Plus aria-hidden="true" /> Add organization
        </Button>
      }
    />
  );

  return (
    <ResourceTable
      table={table}
      page={page}
      columns={columns}
      getRowId={(org) => org.id}
      caption="Organizations"
      searchLabel="Search organizations"
      searchPlaceholder="Search organizations…"
      actions={
        <>
          <SavedViews resource="organizations" />
          {canCreate ? add : undefined}
        </>
      }
      filters={tagFilter(tagOptions)}
      selection={{ selected, onChange: setSelected }}
      bulkBar={
        <BulkBar
          kind="organization"
          ids={[...selected]}
          people={[]}
          tagSuggestions={tagOptions}
          onDone={() => setSelected(new Set())}
        />
      }

      emptyIcon={Building2}
      emptyTitle="No organizations yet"
      emptyDescription="Organizations are created when you convert a lead that names a business, or you can add one yourself."
      emptyAction={canCreate ? add : undefined}
    />
  );
}
