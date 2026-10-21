"use client";

import Link from "next/link";
import { Plus, Contact as ContactIcon } from "lucide-react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { useTableParams } from "@/components/dashboard/data-table/use-table-params";
import { useCan } from "@/components/dashboard/layout/staff-context";
import { Button } from "@/components/dashboard/ui/button";
import type { Page } from "@/lib/pagination";
import { CONTACTS_TABLE } from "../table";
import type { ContactView, PersonRef } from "../types";
import { ContactDialog } from "./contact-dialog";

const columns: Column<ContactView>[] = [
  {
    id: "name",
    header: "Name",
    sortable: true,
    cell: (contact) => (
      <div className="min-w-0">
        <Link
          href={`/dashboard/crm/contacts/${contact.id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {contact.name}
        </Link>
        <p className="text-muted-foreground truncate text-xs">{contact.email}</p>
      </div>
    ),
  },
  {
    id: "organization",
    header: "Organization",
    sortable: true,
    hideBelow: "sm",
    cell: (contact) => contact.organizationName ?? <span className="text-muted-foreground">—</span>,
  },
  { id: "phone", header: "Phone", hideBelow: "lg", cell: (contact) => contact.phone ?? "—" },
  {
    id: "deals",
    header: "Deals",
    hideBelow: "md",
    align: "right",
    cell: (contact) => contact.dealCount,
  },
];

export function ContactsTable({
  page,
  organizations,
  people,
}: {
  page: Page<ContactView>;
  organizations: PersonRef[];
  people: PersonRef[];
}) {
  const table = useTableParams(CONTACTS_TABLE);
  const canCreate = useCan("contacts:create");
  const add = (
    <ContactDialog
      organizations={organizations}
      people={people}
      trigger={
        <Button>
          <Plus aria-hidden="true" /> Add contact
        </Button>
      }
    />
  );

  return (
    <ResourceTable
      table={table}
      page={page}
      columns={columns}
      getRowId={(contact) => contact.id}
      caption="Contacts"
      searchLabel="Search contacts"
      searchPlaceholder="Search contacts…"
      actions={canCreate ? add : undefined}
      emptyIcon={ContactIcon}
      emptyTitle="No contacts yet"
      emptyDescription="Contacts are created when you convert a lead, or you can add one yourself."
      emptyAction={canCreate ? add : undefined}
    />
  );
}
