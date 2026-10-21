"use client";

import Link from "next/link";
import { Building2, Plus } from "lucide-react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { useCan } from "@/components/dashboard/layout/staff-context";
import { Button } from "@/components/dashboard/ui/button";
import type { Page } from "@/lib/pagination";
import { ORGANIZATIONS_TABLE } from "../table";
import type { OrganizationView } from "../types";
import { OrganizationDialog } from "./organization-dialog";

const columns: Column<OrganizationView>[] = [
  {
    id: "name",
    header: "Organization",
    sortable: true,
    cell: (org) => (
      <Link
        href={`/dashboard/crm/organizations/${org.id}`}
        className="font-medium underline-offset-4 hover:underline"
      >
        {org.name}
      </Link>
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
  { id: "deals", header: "Deals", hideBelow: "md", align: "right", cell: (org) => org.dealCount },
];

export function OrganizationsTable({ page }: { page: Page<OrganizationView> }) {
  const canCreate = useCan("organizations:create");
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
      config={ORGANIZATIONS_TABLE}
      page={page}
      columns={columns}
      getRowId={(org) => org.id}
      caption="Organizations"
      searchLabel="Search organizations"
      searchPlaceholder="Search name, industry or website…"
      actions={canCreate ? add : undefined}
      emptyIcon={Building2}
      emptyTitle="No organizations yet"
      emptyDescription="Organizations are created when you convert a lead that names a business, or you can add one yourself."
      emptyAction={canCreate ? add : undefined}
    />
  );
}
