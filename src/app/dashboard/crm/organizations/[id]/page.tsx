import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Contact, Handshake } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { DefinitionList } from "@/components/dashboard/shared/definition-list";
import { EditorLayout } from "@/components/dashboard/shared/editor-layout";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Person } from "@/components/dashboard/shared/person";
import { Thumbnail } from "@/components/dashboard/shared/thumbnail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dashboard/ui/tabs";
import { StageBadge } from "@/features/crm/components/badges";
import { OrganizationActions } from "@/features/crm/components/record-actions";
import { TagsEditor } from "@/features/crm/components/tags-editor";
import { listContactsFor } from "@/features/crm/repository/contacts";
import { listDealsFor } from "@/features/crm/repository/deals";
import { getOrganization } from "@/features/crm/repository/organizations";
import { listTagOptions } from "@/features/crm/repository/tags";
import { requirePageAccess } from "@/lib/auth/dal";
import { formatMinor } from "@/lib/money";

export const metadata: Metadata = { title: "Organization" };

export default async function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("organizations:view");
  if (!staff) return <AccessDenied area="organizations" />;

  const { id } = await params;
  const organization = await getOrganization(id);
  if (!organization) notFound();

  const [deals, contacts, tagOptions] = await Promise.all([
    listDealsFor({ organizationId: id }),
    listContactsFor(id),
    listTagOptions("organization"),
  ]);
  const won = deals
    .filter((deal) => deal.stageKind === "won")
    .reduce((sum, deal) => sum + (deal.amountMinor ?? 0), 0);

  return (
    <>
      <BackLink href="/dashboard/crm/organizations">All organizations</BackLink>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Thumbnail icon={Building2} size="lg" />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{organization.name}</h1>
          <p className="text-muted-foreground text-sm">
            {[organization.industry, organization.size].filter(Boolean).join(" · ") ||
              "No industry or size yet"}
            {won > 0 && ` · ${formatMinor(won, "PHP", { compact: true })} won`}
          </p>
        </div>
      </div>

      <EditorLayout
        rail={
          <>
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <OrganizationActions organization={organization} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <DefinitionList
                  hideEmpty
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
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <TagsEditor
                  kind="organization"
                  id={id}
                  initial={organization.tags}
                  suggestions={tagOptions}
                />
              </CardContent>
            </Card>
          </>
        }
      >
        <Tabs defaultValue="contacts">
          <TabsList>
            <TabsTrigger value="contacts">
              Contacts{contacts.length > 0 && <span className="ml-1">({contacts.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="deals">
              Deals{deals.length > 0 && <span className="ml-1">({deals.length})</span>}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="contacts" className="mt-4">
            <Card>
              <CardContent>
                {contacts.length === 0 ? (
                  <EmptyState
                    compact
                    icon={Contact}
                    title="No contacts yet"
                    description="Link a contact to this organization from the contact's page."
                  />
                ) : (
                  <ul className="divide-y">
                    {contacts.map((contact) => (
                      <li key={contact.id} className="py-3">
                        <Person
                          name={`${contact.firstName} ${contact.lastName}`}
                          email={contact.email}
                          secondary={contact.position ?? contact.email}
                          href={`/dashboard/crm/contacts/${contact.id}`}
                          size="default"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="deals" className="mt-4">
            <Card>
              <CardContent>
                {deals.length === 0 ? (
                  <EmptyState
                    compact
                    icon={Handshake}
                    title="No deals yet"
                    description="Deals for this organization will be listed here."
                  />
                ) : (
                  <ul className="divide-y">
                    {deals.map((deal) => (
                      <li key={deal.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/crm/deals/${deal.id}`}
                            className="text-sm font-medium underline-offset-4 hover:underline"
                          >
                            {deal.title}
                          </Link>
                          <p className="text-muted-foreground text-xs">{deal.contactName}</p>
                        </div>
                        <span className="flex items-center gap-3 text-sm">
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
          </TabsContent>
        </Tabs>
      </EditorLayout>
    </>
  );
}
