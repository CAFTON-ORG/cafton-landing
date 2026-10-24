import { TabCount } from "@/components/dashboard/shared/tab-count";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { EditorLayout } from "@/components/dashboard/shared/editor-layout";
import { UserAvatar } from "@/components/dashboard/shared/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dashboard/ui/tabs";
import { FilesPanel } from "@/features/crm/components/files-panel";
import { CustomFieldsForm } from "@/features/crm/components/custom-fields-form";
import { listCustomFields } from "@/features/crm/repository/custom-fields";
import { listFiles } from "@/features/crm/repository/files";
import { getServices } from "@/features/cms/repository/services";
import { ActivityTimeline } from "@/features/crm/components/activity-timeline";
import { LeadScoreBadge, LeadStatusBadge } from "@/features/crm/components/badges";
import { DetailsPanel, DetailsSection, Fact, Facts } from "@/features/crm/components/detail-parts";
import { EnquiryAnswers } from "@/features/crm/components/enquiry-answers";
import { LeadActions, LeadOwner } from "@/features/crm/components/lead-actions";
import { TagsEditor } from "@/features/crm/components/tags-editor";
import { NewTaskForm, TaskRows, TasksEmpty } from "@/features/crm/components/task-list";
import { listActivities } from "@/features/crm/repository/activity";
import { getLead } from "@/features/crm/repository/leads";
import { listStaffOptions } from "@/features/crm/repository/pipeline";
import { listTagOptions } from "@/features/crm/repository/tags";
import { listTasksFor } from "@/features/crm/repository/tasks";
import { MeetingsPanel } from "@/features/schedule/components/meetings-panel";
import { listMeetingsFor } from "@/features/schedule/repository/schedule";
import { actorId } from "@/lib/actions";
import { requirePageAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Lead" };

const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

const text = (value: unknown) => (typeof value === "string" ? value : "");

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("leads:view");
  if (!staff) return <AccessDenied area="leads" />;

  const { id } = await params;
  // Everything this page needs is asked for at once: each round trip to the database is slow.
  const [found, services, activities, tasks, people, meetings, tagOptions, files, customFields] =
    await Promise.all([
      getLead(id),
      getServices(),
      listActivities({ leadId: id }),
      listTasksFor({ leadId: id }),
      listStaffOptions(),
      listMeetingsFor({ leadId: id }),
      listTagOptions("lead"),
      listFiles({ leadId: id }),
      listCustomFields("lead"),
    ]);
  if (!found) notFound();
  const { lead, answers } = found;

  const waitingDays = daysSince(lead.createdAt);
  const nextStep =
    lead.status === "new"
      ? waitingDays >= 1
        ? `Waiting ${waitingDays} ${waitingDays === 1 ? "day" : "days"} for a first reply. Answer soon, then qualify or disqualify.`
        : "Reply within one business day, then qualify or disqualify."
      : lead.status === "qualified"
        ? lead.dealId
          ? "Converted. Carry on in the deal."
          : "Qualified. Convert it to a deal when you have agreed the next step."
        : "Closed as not a fit. Reopen it if that changes.";
  const openTasks = tasks.filter((task) => !task.doneAt).length;
  const goalsArea = services.find((pillar) => pillar.slug === text(answers.goalsCategory))?.title;

  return (
    <>
      <BackLink href="/dashboard/crm/leads">All leads</BackLink>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <UserAvatar name={lead.name} email={lead.email} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
              <LeadStatusBadge status={lead.status} />
            </div>
            <p className="text-muted-foreground text-sm">
              {[lead.businessName, lead.reference].filter(Boolean).join(" · ")} · received{" "}
              {formatDate(lead.createdAt, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        </div>
        <LeadActions lead={lead} />
      </div>

      <EditorLayout
        rail={
          <DetailsPanel>
            <DetailsSection title="Owner">
              <LeadOwner lead={lead} people={people} />
              <p className="text-muted-foreground text-xs">
                The teammate responsible for the next step.
              </p>
            </DetailsSection>
            <DetailsSection title="Score">
              <div className="grid gap-2">
                <div>
                  <LeadScoreBadge score={lead.score} band={lead.scoreBand} />
                </div>
                {lead.scoreReasons.length > 0 ? (
                  <ul className="text-muted-foreground grid gap-1 text-sm">
                    {lead.scoreReasons.map((reason) => (
                      <li key={reason.label} className="flex justify-between gap-3">
                        <span>{reason.label}</span>
                        <span className="text-foreground tabular-nums">+{reason.points}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Nothing in the enquiry to score yet.
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  A hint for who to call first, worked out from the contact form. It does not
                  qualify the lead; you do.
                </p>
              </div>
            </DetailsSection>
            <DetailsSection title="Contact">
              <Facts>
                <Fact label="Email">
                  <a className="underline underline-offset-4" href={`mailto:${lead.email}`}>
                    {lead.email}
                  </a>
                </Fact>
                <Fact label="Phone">
                  {lead.phone && (
                    <a className="underline underline-offset-4" href={`tel:${lead.phone}`}>
                      {lead.phone}
                    </a>
                  )}
                </Fact>
                <Fact label="Came from">
                  {[lead.source, lead.pagePath].filter(Boolean).join(" · ")}
                </Fact>
                <Fact label="Contact">
                  {lead.contactId && (
                    <Link
                      className="underline underline-offset-4"
                      href={`/dashboard/crm/contacts/${lead.contactId}`}
                    >
                      View contact
                    </Link>
                  )}
                </Fact>
                <Fact label="Deal">
                  {lead.dealId && (
                    <Link
                      className="underline underline-offset-4"
                      href={`/dashboard/crm/deals/${lead.dealId}`}
                    >
                      Open deal
                    </Link>
                  )}
                </Fact>
                <Fact label="Disqualified because">{lead.disqualifiedReason}</Fact>
              </Facts>
            </DetailsSection>
            <DetailsSection title="Their project">
              <Facts>
                <Fact label="Interested in">{goalsArea ?? lead.goalsArea}</Fact>
                <Fact label="Budget">{lead.budget}</Fact>
                <Fact label="Timeline">{lead.timeline}</Fact>
              </Facts>
            </DetailsSection>
            {customFields.length > 0 && (
              <DetailsSection title="Custom fields">
                <CustomFieldsForm entity="lead" id={id} defs={customFields} values={lead.custom} />
              </DetailsSection>
            )}
            <DetailsSection title="Tags">
              <TagsEditor kind="lead" id={id} initial={lead.tags} suggestions={tagOptions} />
            </DetailsSection>
          </DetailsPanel>
        }
      >
        <p
          className={
            lead.status === "new" && waitingDays >= 1
              ? "rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
              : "bg-muted/50 rounded-lg border px-4 py-3 text-sm"
          }
        >
          <span className="font-medium">Next step: </span>
          {nextStep}
        </p>

        <Tabs defaultValue="activity">
          <TabsList>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="enquiry">Enquiry</TabsTrigger>
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
              subject={{ leadId: id }}
              activities={activities}
              writePermission="leads:update"
              currentUserId={actorId(staff) ?? undefined}
              recipient={{ name: lead.name, email: lead.email }}
            />
          </TabsContent>
          <TabsContent value="enquiry" className="mt-4">
            <EnquiryAnswers answers={answers} goalsArea={goalsArea} />
          </TabsContent>
          <TabsContent value="tasks" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Tasks</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <NewTaskForm
                  subject={{ leadId: id }}
                  people={people}
                  currentUserId={actorId(staff) ?? undefined}
                />
                {tasks.length === 0 ? (
                  <TasksEmpty description="Nothing to do for this lead." />
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
                leadId: id,
                title: `Intro call with ${lead.name}`,
                attendeeName: lead.name,
                attendeeEmail: lead.email,
                attendeePhone: lead.phone ?? undefined,
              }}
            />
          </TabsContent>
          <TabsContent value="files" className="mt-4">
            <FilesPanel
              subject={{ leadId: id }}
              files={files}
              currentUserId={actorId(staff) ?? undefined}
            />
          </TabsContent>
        </Tabs>
      </EditorLayout>
    </>
  );
}
