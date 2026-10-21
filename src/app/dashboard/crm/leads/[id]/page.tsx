import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { DefinitionList } from "@/components/dashboard/shared/definition-list";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import { ActivityTimeline } from "@/features/crm/components/activity-timeline";
import { LeadStatusBadge } from "@/features/crm/components/badges";
import { LeadActions } from "@/features/crm/components/lead-actions";
import { NewTaskForm, TaskRows, TasksEmpty } from "@/features/crm/components/task-list";
import { listActivities } from "@/features/crm/repository/activity";
import { getLead } from "@/features/crm/repository/leads";
import { listStaffOptions } from "@/features/crm/repository/pipeline";
import { listTasksFor } from "@/features/crm/repository/tasks";
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

  const [activities, tasks, people] = await Promise.all([
    listActivities({ leadId: id }),
    listTasksFor({ leadId: id }),
    listStaffOptions(),
  ]);

  return (
    <>
      <BackLink href="/dashboard/crm/leads">All leads</BackLink>
      <PageHeader
        title={lead.name}
        description={`${lead.reference} · received ${formatDate(lead.createdAt, { dateStyle: "medium", timeStyle: "short" })}`}
        action={<LeadStatusBadge status={lead.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <DefinitionList
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
                  {
                    label: "Came from",
                    value: [lead.source, lead.pagePath].filter(Boolean).join(" · "),
                  },
                  {
                    label: "Linked contact",
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
              <CardTitle>What they told us</CardTitle>
            </CardHeader>
            <CardContent>
              <DefinitionList
                items={ANSWER_LABELS.map(([key, label]) => ({ label, value: show(answers[key]) }))}
              />
            </CardContent>
          </Card>

          <ActivityTimeline
            subject={{ leadId: id }}
            activities={activities}
            writePermission="leads:update"
          />
        </div>

        <div className="grid content-start gap-4">
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
        </div>
      </div>
    </>
  );
}
