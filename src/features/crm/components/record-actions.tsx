"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { Button } from "@/components/dashboard/ui/button";
import { useServerAction } from "@/hooks/use-server-action";
import { deleteContact, deleteOrganization } from "../actions/contacts";
import { checkContactDelete, checkOrganizationDelete } from "../rules/core";
import type { ContactView, OrganizationView, PersonRef } from "../types";
import { ContactDialog } from "./contact-dialog";
import { OrganizationDialog } from "./organization-dialog";

export function ContactActions({
  contact,
  organizations,
  people,
}: {
  contact: ContactView;
  organizations: PersonRef[];
  people: PersonRef[];
}) {
  const router = useRouter();
  const canUpdate = useCan("contacts:update");
  const canDelete = useCan("contacts:delete");
  const [confirming, setConfirming] = useState(false);
  const { run, pending } = useServerAction();
  const blocked = checkContactDelete({ liveDeals: contact.dealCount });

  return (
    <div className="flex flex-wrap gap-2">
      {canUpdate && (
        <ContactDialog
          contact={contact}
          organizations={organizations}
          people={people}
          trigger={
            <Button variant="outline">
              <Pencil aria-hidden="true" /> Edit
            </Button>
          }
        />
      )}
      {canDelete && (
        <>
          <Button
            variant="ghost"
            disabled={!!blocked || pending}
            title={blocked ?? undefined}
            onClick={() => setConfirming(true)}
          >
            <Trash2 aria-hidden="true" /> Delete
          </Button>
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title="Delete this contact?"
            description={`${contact.name} will be removed from your contacts.`}
            confirmLabel="Delete contact"
            destructive
            pending={pending}
            onConfirm={() =>
              run(() => deleteContact(contact.id), {
                success: "Contact deleted.",
                onSuccess: () => router.push("/dashboard/crm/contacts"),
              })
            }
          />
        </>
      )}
    </div>
  );
}

export function OrganizationActions({ organization }: { organization: OrganizationView }) {
  const router = useRouter();
  const canUpdate = useCan("organizations:update");
  const canDelete = useCan("organizations:delete");
  const [confirming, setConfirming] = useState(false);
  const { run, pending } = useServerAction();
  const blocked = checkOrganizationDelete({
    contacts: organization.contactCount,
    deals: organization.dealCount,
  });

  return (
    <div className="flex flex-wrap gap-2">
      {canUpdate && (
        <OrganizationDialog
          organization={organization}
          trigger={
            <Button variant="outline">
              <Pencil aria-hidden="true" /> Edit
            </Button>
          }
        />
      )}
      {canDelete && (
        <>
          <Button
            variant="ghost"
            disabled={!!blocked || pending}
            title={blocked ?? undefined}
            onClick={() => setConfirming(true)}
          >
            <Trash2 aria-hidden="true" /> Delete
          </Button>
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title="Delete this organization?"
            description={`${organization.name} will be removed.`}
            confirmLabel="Delete organization"
            destructive
            pending={pending}
            onConfirm={() =>
              run(() => deleteOrganization(organization.id), {
                success: "Organization deleted.",
                onSuccess: () => router.push("/dashboard/crm/organizations"),
              })
            }
          />
        </>
      )}
    </div>
  );
}
