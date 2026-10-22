import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { DefinitionList } from "@/components/dashboard/shared/definition-list";
import { EditorLayout } from "@/components/dashboard/shared/editor-layout";
import { UserAvatar } from "@/components/dashboard/shared/user-avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dashboard/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import { EnquiryAnswers } from "@/features/crm/components/enquiry-answers";
import { TagsEditor } from "@/features/crm/components/tags-editor";
import { listTagOptions } from "@/features/crm/repository/tags";
import { ActivityTimeline } from "@/features/crm/components/activity-timeline";
import { LeadStatusBadge } from "@/features/crm/components/badges";
import { LeadActions } from "@/features/crm/components/lead-actions";
import { NewTaskForm, TaskRows, TasksEmpty } from "@/features/crm/components/task-list";
import { getServices } from "@/features/cms/repository/services";
import { listActivities } from "@/features/crm/repository/activity";
import { getLead } from "@/features/crm/repository/leads";
import { listStaffOptions } from "@/features/crm/repository/pipeline";
import { listTasksFor } from "@/features/crm/repository/tasks";
import { MeetingsPanel } from "@/features/schedule/components/meetings-panel";
import { listMeetingsFor } from "@/features/schedule/repository";
import { actorId } from "@/lib/actions";
import { requirePageAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Lead" };

/** Human labels for the stored form answers, in the order the form asked them. */
const ANSWER_LABELS: [string, string][] = [
  ["buildingFor", "This project is for"],
  ["businessName", "Business"],
  ["industry", "Industry"],
  ["position", "Their role"],
  ["businessSize", "Business size"],
  ["yearsOperating", "Years operating"],
  ["officeAddress", "Office address"],
  ["challenges", "Challenges"],
  ["challengesOther", "Other challenge"],
  ["goalsCategory", "Goals area"],
  ["goals", "Goals"],
  ["budget", "Budget"],
  ["timeline", "Timeline"],
  ["referralSource", "Heard about us via"],
  ["notes", "Notes"],
];

const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

function show(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.join("; ") : "";
  return typeof value === "string" ? value : "";
}

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("leads:view");
  if (!staff) return <AccessDenied area="leads" />;

  const { id } = await params;
  const found = await getLead(id);
  if (!found) notFound();
  const { lead, answers } = found;

  const services = await getServices();
  const answered = ANSWER_LABELS.map(([key, label]) => ({
    label,
    value:
      key === "goalsCategory"
        ? (services.find((pillar) => pillar.slug === show(answers[key]))?.title ??
          show(answers[key]))
        : show(answers[key]),
  })).filter((item) => item.value);

  const [activities, tasks, people, meetings, tagOptions] = await Promise.all([
    listActivities({ leadId: id }),
    listTasksFor({ leadId: id }),
    listStaffOptions(),
    listMeetingsFor({ leadId: id }),
    listTagOptions("lead"),
  ]);

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

  return (
    <>
      <BackLink href="/dashboard/crm/leads">All leads</BackLink>
      <div className="mb-6 flex flex-wrap items-center gap-4">
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

      <EditorLayout
        rail={
          <>
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <LeadActions lead={lead} people={people} />
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
                      label: "Email",
                      value: (
                        <a className="underline underline-offset-4" href={`mailto:${lead.email}`}>
                          {lead.email}
                        </a>
                      ),
                    },
                    {
                      label: "Phone",
                      value: lead.phone ? (
                        <a className="underline underline-offset-4" href={`tel:${lead.phone}`}>
                          {lead.phone}
                        </a>
                      ) : (
                        ""
                      ),
                    },
                    { label: "Budget", value: lead.budget ?? "" },
                    { label: "Timeline", value: lead.timeline ?? "" },
                    {
                      label: "Came from",
                      value: [lead.source, lead.pagePath].filter(Boolean).join(" · "),
                    },
                    {
                      label: "Contact",
                      value: lead.contactId ? (
                        <Link
                          className="underline underline-offset-4"
                          href={`/dashboard/crm/contacts/${lead.contactId}`}
                        >
                          View contact
                        </Link>
                      ) : (
                        ""
                      ),
                    },
                    {
                      label: "Deal",
                      value: lead.dealId ? (
                        <Link
                          className="underline underline-offset-4"
                          href={`/dashboard/crm/deals/${lead.dealId}`}
                        >
                          Open deal
                        </Link>
                      ) : (
                        ""
                      ),
                    },
                    ...(lead.disqualifiedReason
                      ? [{ label: "Disqualified because", value: lead.disqualifiedReason }]
                      : []),
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <TagsEditor kind="lead" id={id} initial={lead.tags} suggestions={tagOptions} />
              </CardContent>
            </Card>

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
          </>
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
            <TabsTrigger value="enquiry">
              What they told us
              {answered.length > 0 && <span className="ml-1">({answered.length})</span>}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="activity" className="mt-4">
            <ActivityTimeline
              subject={{ leadId: id }}
              activities={activities}
              writePermission="leads:update"
              currentUserId={actorId(staff) ?? undefined}
            />
          </TabsContent>
          <TabsContent value="enquiry" className="mt-4">
            <EnquiryAnswers
              answers={answers}
              goalsArea={
                services.find((pillar) => pillar.slug === show(answers.goalsCategory))?.title
              }
            />
          </TabsContent>
        </Tabs>
      </EditorLayout>
    </>
  );
}
