import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { DefinitionList } from "@/components/dashboard/shared/definition-list";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import { StageBadge } from "@/features/crm/components/badges";
import { OrganizationActions } from "@/features/crm/components/record-actions";
import { listContactsFor } from "@/features/crm/repository/contacts";
import { getOrganization } from "@/features/crm/repository/organizations";
import { listDealsFor } from "@/features/crm/repository/deals";
import { requirePageAccess } from "@/lib/auth/dal";
import { formatMinor } from "@/lib/money";

export const metadata: Metadata = { title: "Organization" };

export default async function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("organizations:view");
  if (!staff) return <AccessDenied area="organizations" />;

  const { id } = await params;
  const organization = await getOrganization(id);
  if (!organization) notFound();

  const [deals, contacts] = await Promise.all([
    listDealsFor({ organizationId: id }),
    listContactsFor(id),
  ]);

  return (
    <>
      <BackLink href="/dashboard/crm/organizations">All organizations</BackLink>
      <PageHeader
        title={organization.name}
        description={
          [organization.industry, organization.size].filter(Boolean).join(" · ") || undefined
        }
        action={<OrganizationActions organization={organization} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <DefinitionList
              items={[
                {
                  label: "Website",
                  value: organization.website ? (
                    <a
                      className="underline underline-offset-4"
                      href={organization.website}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {organization.website}
                    </a>
                  ) : (
                    ""
                  ),
                },
                { label: "Phone", value: organization.phone },
                { label: "Address", value: organization.address },
                { label: "Notes", value: organization.notes },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No contacts yet. Link one from the contact&rsquo;s page.
              </p>
            ) : (
              <ul className="divide-y">
                {contacts.map((contact) => (
                  <li key={contact.id} className="py-2">
                    <Link
                      href={`/dashboard/crm/contacts/${contact.id}`}
                      className="text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {contact.firstName} {contact.lastName}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {contact.position ?? contact.email}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deals</CardTitle>
          </CardHeader>
          <CardContent>
            {deals.length === 0 ? (
              <p className="text-muted-foreground text-sm">No deals yet.</p>
            ) : (
              <ul className="divide-y">
                {deals.map((deal) => (
                  <li key={deal.id} className="grid gap-1 py-2">
                    <Link
                      href={`/dashboard/crm/deals/${deal.id}`}
                      className="text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {deal.title}
                    </Link>
                    <span className="flex items-center gap-2 text-xs">
                      <StageBadge deal={deal} />
                      <span className="text-muted-foreground tabular-nums">
                        {formatMinor(deal.amountMinor, deal.currency, { compact: true })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
