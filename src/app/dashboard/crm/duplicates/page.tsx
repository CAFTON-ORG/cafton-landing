import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { DuplicatesView } from "@/features/crm/components/duplicates-view";
import {
  listDuplicateContacts,
  listDuplicateLeads,
  listDuplicateOrganizations,
} from "@/features/crm/repository/duplicates";
import { can, requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Duplicates" };

export default async function DuplicatesPage() {
  const staff = await requirePageAccess("contacts:view");
  if (
    !staff ||
    (!can(staff, "leads:merge") &&
      !can(staff, "contacts:merge") &&
      !can(staff, "organizations:merge"))
  ) {
    return <AccessDenied area="the duplicate check" />;
  }
  const [leads, contacts, organizations] = await Promise.all([
    can(staff, "leads:merge") ? listDuplicateLeads() : [],
    can(staff, "contacts:merge") ? listDuplicateContacts() : [],
    can(staff, "organizations:merge") ? listDuplicateOrganizations() : [],
  ]);

  return (
    <>
      <BackLink href="/dashboard/crm/contacts">Contacts</BackLink>
      <PageHeader
        title="Duplicates"
        description="Leads, contacts and organizations that look like the same person or company. Pick the one to keep and merge the rest into it."
      />
      <DuplicatesView leads={leads} contacts={contacts} organizations={organizations} />
    </>
  );
}
