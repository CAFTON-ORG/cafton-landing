import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { DefinitionList } from "@/components/dashboard/shared/definition-list";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import { ActivityTimeline } from "@/features/crm/components/activity-timeline";
import { StageBadge } from "@/features/crm/components/badges";
import { ContactActions } from "@/features/crm/components/record-actions";
import { NewTaskForm, TaskRows, TasksEmpty } from "@/features/crm/components/task-list";
import { listActivities } from "@/features/crm/repository/activity";
import { getContact } from "@/features/crm/repository/contacts";
import { listDealsFor } from "@/features/crm/repository/deals";
import { listOrganizationOptions } from "@/features/crm/repository/organizations";
import { listStaffOptions } from "@/features/crm/repository/pipeline";
import { listTasksFor } from "@/features/crm/repository/tasks";
import { actorId } from "@/lib/actions";
import { requirePageAccess } from "@/lib/auth/dal";
import { formatMinor } from "@/lib/money";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("contacts:view");
  if (!staff) return <AccessDenied area="contacts" />;

  const { id } = await params;
  const contact = await getContact(id);
  if (!contact) notFound();

  const [deals, activities, tasks, organizations, people] = await Promise.all([
    listDealsFor({ contactId: id }),
    listActivities({ contactId: id }),
    listTasksFor({ contactId: id }),
    listOrganizationOptions(),
    listStaffOptions(),
  ]);

  return (
    <>
      <BackLink href="/dashboard/crm/contacts">All contacts</BackLink>
      <PageHeader
        title={contact.name}
        description={
          [contact.position, contact.organizationName].filter(Boolean).join(" at ") || contact.email
        }
        action={<ContactActions contact={contact} organizations={organizations} people={people} />}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <DefinitionList
                items={[
                  {
                    label: "Email",
                    value: (
                      <a className="underline underline-offset-4" href={`mailto:${contact.email}`}>
                        {contact.email}
                      </a>
                    ),
                  },
                  {
                    label: "Phone",
                    value: contact.phone ? (
                      <a className="underline underline-offset-4" href={`tel:${contact.phone}`}>
                        {contact.phone}
                      </a>
                    ) : (
                      ""
                    ),
                  },
                  {
                    label: "Organization",
                    value: contact.organizationId ? (
                      <Link
                        className="underline underline-offset-4"
                        href={`/dashboard/crm/organizations/${contact.organizationId}`}
                      >
                        {contact.organizationName}
                      </Link>
                    ) : (
                      ""
                    ),
                  },
                  { label: "Owner", value: contact.ownerName },
                  { label: "Source", value: contact.source },
                  { label: "Notes", value: contact.notes },
                ]}
              />
            </CardContent>
          </Card>
          <ActivityTimeline
            subject={{ contactId: id }}
            activities={activities}
            writePermission="contacts:update"
          />
        </div>

        <div className="grid content-start gap-4">
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
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <NewTaskForm
                subject={{ contactId: id }}
                people={people}
                currentUserId={actorId(staff) ?? undefined}
              />
              {tasks.length === 0 ? (
                <TasksEmpty description="Nothing to do for this contact." />
              ) : (
                <TaskRows tasks={tasks} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
