import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { ContactsTable } from "@/features/crm/components/contacts-table";
import { listContacts } from "@/features/crm/repository/contacts";
import { listOrganizationOptions } from "@/features/crm/repository/organizations";
import { listStaffOptions } from "@/features/crm/repository/pipeline";
import { CONTACTS_TABLE } from "@/features/crm/table";
import { requirePageAccess } from "@/lib/auth/dal";
import { parseTableParams, searchParamsFromRecord } from "@/lib/table-params";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("contacts:view");
  if (!staff) return <AccessDenied area="contacts" />;

  const params = parseTableParams(searchParamsFromRecord(await searchParams), CONTACTS_TABLE);
  const [page, organizations, people] = await Promise.all([
    listContacts(params),
    listOrganizationOptions(),
    listStaffOptions(),
  ]);

  return (
    <>
      <PageHeader title="Contacts" description="The people you do business with." />
      <ContactsTable page={page} organizations={organizations} people={people} />
    </>
  );
}
