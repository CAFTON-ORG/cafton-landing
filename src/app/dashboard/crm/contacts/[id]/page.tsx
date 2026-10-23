import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Handshake } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { EditorLayout } from "@/components/dashboard/shared/editor-layout";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Person } from "@/components/dashboard/shared/person";
import { UserAvatar } from "@/components/dashboard/shared/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dashboard/ui/tabs";
import { FilesPanel } from "@/features/crm/components/files-panel";
import { CustomFieldsForm } from "@/features/crm/components/custom-fields-form";
import { listCustomFields } from "@/features/crm/repository/custom-fields";
import { listFiles } from "@/features/crm/repository/files";
import { ActivityTimeline } from "@/features/crm/components/activity-timeline";
import { StageBadge } from "@/features/crm/components/badges";
import {
  DetailsPanel,
  DetailsSection,
  Fact,
  Facts,
  TabCount,
} from "@/features/crm/components/detail-parts";
import { ContactActions } from "@/features/crm/components/record-actions";
import { TagsEditor } from "@/features/crm/components/tags-editor";
import { NewTaskForm, TaskRows, TasksEmpty } from "@/features/crm/components/task-list";
import { listActivities } from "@/features/crm/repository/activity";
import { getContact } from "@/features/crm/repository/contacts";
import { listDealsFor } from "@/features/crm/repository/deals";
import { listOrganizationOptions } from "@/features/crm/repository/organizations";
import { listStaffOptions } from "@/features/crm/repository/pipeline";
import { listTagOptions } from "@/features/crm/repository/tags";
import { listTasksFor } from "@/features/crm/repository/tasks";
import { MeetingsPanel } from "@/features/schedule/components/meetings-panel";
import { listMeetingsFor } from "@/features/schedule/repository";
import { actorId } from "@/lib/actions";
import { requirePageAccess } from "@/lib/auth/dal";
import { formatMinor } from "@/lib/money";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("contacts:view");
  if (!staff) return <AccessDenied area="contacts" />;

  const { id } = await params;
  // Everything this page needs is asked for at once: each round trip to the database is slow.
  const [
    contact,
    deals,
    activities,
    tasks,
    organizations,
    people,
    meetings,
    tagOptions,
    files,
    customFields,
  ] = await Promise.all([
    getContact(id),
    listDealsFor({ contactId: id }),
    listActivities({ contactId: id }),
    listTasksFor({ contactId: id }),
    listOrganizationOptions(),
    listStaffOptions(),
    listMeetingsFor({ contactId: id }),
    listTagOptions("contact"),
    listFiles({ contactId: id }),
    listCustomFields("contact"),
  ]);
  if (!contact) notFound();
  const openTasks = tasks.filter((task) => !task.doneAt).length;

  return (
    <>
      <BackLink href="/dashboard/crm/contacts">All contacts</BackLink>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <UserAvatar name={contact.name} email={contact.email} size="lg" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{contact.name}</h1>
            <p className="text-muted-foreground text-sm">
              {[contact.position, contact.organizationName].filter(Boolean).join(" at ") ||
                contact.email}
            </p>
          </div>
        </div>
        <ContactActions contact={contact} organizations={organizations} people={people} />
      </div>

      <EditorLayout
        rail={
          <DetailsPanel>
            <DetailsSection title="Contact">
              <Facts>
                <Fact label="Email">
                  <a className="underline underline-offset-4" href={`mailto:${contact.email}`}>
                    {contact.email}
                  </a>
                </Fact>
                <Fact label="Phone">
                  {contact.phone && (
                    <a className="underline underline-offset-4" href={`tel:${contact.phone}`}>
                      {contact.phone}
                    </a>
                  )}
                </Fact>
                <Fact label="Organization">
                  {contact.organizationId && (
                    <Link
                      className="underline underline-offset-4"
                      href={`/dashboard/crm/organizations/${contact.organizationId}`}
                    >
                      {contact.organizationName}
                    </Link>
                  )}
                </Fact>
                <Fact label="Source">{contact.source}</Fact>
                <Fact label="Notes">{contact.notes}</Fact>
              </Facts>
            </DetailsSection>
            <DetailsSection title="Owner">
              <Person name={contact.ownerName} avatarUrl={contact.ownerAvatar} />
              <p className="text-muted-foreground text-xs">
                The teammate responsible for this contact.
              </p>
            </DetailsSection>
            {customFields.length > 0 && (
              <DetailsSection title="Custom fields">
                <CustomFieldsForm
                  entity="contact"
                  id={id}
                  defs={customFields}
                  values={contact.custom}
                />
              </DetailsSection>
            )}
            <DetailsSection title="Tags">
              <TagsEditor kind="contact" id={id} initial={contact.tags} suggestions={tagOptions} />
            </DetailsSection>
          </DetailsPanel>
        }
      >
        <Tabs defaultValue="activity">
          <TabsList>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="deals">
              Deals
              <TabCount n={deals.length} />
            </TabsTrigger>
            <TabsTrigger value="tasks">
              Tasks
              <TabCount n={openTasks} />
            </TabsTrigger>
            <TabsTrigger value="meetings">
              Meetings
              <TabCount n={meetings.length} />
            </TabsTrigger>
            <TabsTrigger value="files">
              Files
              <TabCount n={files.length} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-4">
            <ActivityTimeline
              subject={{ contactId: id }}
              activities={activities}
              writePermission="contacts:update"
              currentUserId={actorId(staff) ?? undefined}
              recipient={{ name: contact.name, email: contact.email }}
            />
          </TabsContent>

          <TabsContent value="deals" className="mt-4">
            <Card>
              <CardContent>
                {deals.length === 0 ? (
                  <EmptyState
                    compact
                    icon={Handshake}
                    title="No deals yet"
                    description="Deals for this contact will be listed here."
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
                          <p className="text-muted-foreground text-xs">{deal.reference}</p>
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

          <TabsContent value="tasks" className="mt-4">
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
          </TabsContent>

          <TabsContent value="meetings" className="mt-4">
            <MeetingsPanel
              meetings={meetings}
              people={people}
              defaults={{
                contactId: id,
                title: `Call with ${contact.name}`,
                attendeeName: contact.name,
                attendeeEmail: contact.email,
                attendeePhone: contact.phone,
              }}
            />
          </TabsContent>
          <TabsContent value="files" className="mt-4">
            <FilesPanel
              subject={{ contactId: id }}
              files={files}
              currentUserId={actorId(staff) ?? undefined}
            />
          </TabsContent>
        </Tabs>
      </EditorLayout>
    </>
  );
}
