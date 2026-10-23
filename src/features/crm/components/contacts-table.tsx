"use client";

import { useState } from "react";
import Link from "next/link";
import { Person } from "@/components/dashboard/shared/person";
import { Plus, Contact as ContactIcon } from "lucide-react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { useTableParams } from "@/components/dashboard/data-table/use-table-params";
import { useCan } from "@/components/dashboard/layout/staff-context";
import { Button } from "@/components/dashboard/ui/button";
import { UserAvatar } from "@/components/dashboard/shared/user-avatar";
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
import { CONTACTS_TABLE } from "../table";
import type { ContactView, PersonRef } from "../types";
import type { CustomFieldDef } from "../custom-fields";
import { ContactDialog } from "./contact-dialog";

const baseColumns: Column<ContactView>[] = [
  {
    id: "name",
    header: "Name",
    sortable: true,
    cell: (contact) => (
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar name={contact.name} email={contact.email} className="shrink-0" />
        <div className="min-w-0">
          <Link
            href={`/dashboard/crm/contacts/${contact.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {contact.name}
          </Link>
          <p className="text-muted-foreground truncate text-xs">{contact.email}</p>
        </div>
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
  {
    id: "owner",
    header: "Owner",
    hideBelow: "lg",
    cell: (contact) => <Person name={contact.ownerName} avatarUrl={contact.ownerAvatar} />,
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
  customFields,
  page,
  organizations,
  people,
  tagOptions,
}: {
  customFields: CustomFieldDef[];
  page: Page<ContactView>;
  organizations: PersonRef[];
  people: PersonRef[];
  tagOptions: string[];
}) {
  const table = useTableParams(CONTACTS_TABLE);
  const columns = [...baseColumns, ...customColumns<ContactView>(customFields)];
  const canCreate = useCan("contacts:create");
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
      actions={
        <>
          <SavedViews resource="contacts" />
          {canCreate ? add : undefined}
        </>
      }
      filters={tagFilter(tagOptions)}
      selection={{ selected, onChange: setSelected }}
      bulkBar={
        <BulkBar
          kind="contact"
          ids={[...selected]}
          people={people}
          tagSuggestions={tagOptions}
          onDone={() => setSelected(new Set())}
        />
      }

      emptyIcon={ContactIcon}
      emptyTitle="No contacts yet"
      emptyDescription="Contacts are created when you convert a lead, or you can add one yourself."
      emptyAction={canCreate ? add : undefined}
    />
  );
}
