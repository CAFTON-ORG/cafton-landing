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
import { DealActions } from "@/features/crm/components/deal-actions";
import { NewTaskForm, TaskRows, TasksEmpty } from "@/features/crm/components/task-list";
import { listActivities } from "@/features/crm/repository/activity";
import { listContactOptions } from "@/features/crm/repository/contacts";
import { getDeal } from "@/features/crm/repository/deals";
import { listOrganizationOptions } from "@/features/crm/repository/organizations";
import { listStages, listStaffOptions } from "@/features/crm/repository/pipeline";
import { listTasksFor } from "@/features/crm/repository/tasks";
import { checkAddTaskToDeal } from "@/features/crm/rules";
import { actorId } from "@/lib/actions";
import { requirePageAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";

export const metadata: Metadata = { title: "Deal" };

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("deals:view");
  if (!staff) return <AccessDenied area="deals" />;

  const { id } = await params;
  const deal = await getDeal(id);
  if (!deal) notFound();

  const [stages, activities, tasks, contacts, organizations, people] = await Promise.all([
    listStages(),
    listActivities({ dealId: id }),
    listTasksFor({ dealId: id }),
    listContactOptions(),
    listOrganizationOptions(),
    listStaffOptions(),
  ]);
  const canAddTask = !checkAddTaskToDeal({
    stageKind: deal.stageKind,
    amountMinor: deal.amountMinor,
  });

  return (
    <>
      <BackLink href="/dashboard/crm/deals">All deals</BackLink>
      <PageHeader
        title={deal.title}
        description={`${deal.reference} · ${formatMinor(deal.amountMinor, deal.currency)}${deal.stageKind === "open" ? ` · ${deal.probability}% likely` : ""}`}
        action={<StageBadge deal={deal} />}
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
                    label: "Contact",
                    value: (
                      <Link
                        className="underline underline-offset-4"
                        href={`/dashboard/crm/contacts/${deal.contactId}`}
                      >
                        {deal.contactName}
                      </Link>
                    ),
                  },
                  {
                    label: "Organization",
                    value: deal.organizationId ? (
                      <Link
                        className="underline underline-offset-4"
                        href={`/dashboard/crm/organizations/${deal.organizationId}`}
                      >
                        {deal.organizationName}
                      </Link>
                    ) : (
                      ""
                    ),
                  },
                  { label: "Owner", value: deal.ownerName },
                  {
                    label: "Expected close",
                    value: deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : "",
                  },
                  { label: "Source", value: deal.source },
                  {
                    label: "Lead",
                    value: deal.leadId ? (
                      <Link
                        className="underline underline-offset-4"
                        href={`/dashboard/crm/leads/${deal.leadId}`}
                      >
                        View the original enquiry
                      </Link>
                    ) : (
                      ""
                    ),
                  },
                  ...(deal.wonAt ? [{ label: "Won on", value: formatDate(deal.wonAt) }] : []),
                  ...(deal.lostAt ? [{ label: "Lost on", value: formatDate(deal.lostAt) }] : []),
                  ...(deal.lostReason
                    ? [{ label: "Why it was lost", value: deal.lostReason }]
                    : []),
                ]}
              />
              {deal.description && (
                <p className="mt-4 border-t pt-4 text-sm whitespace-pre-wrap">{deal.description}</p>
              )}
            </CardContent>
          </Card>
          <ActivityTimeline
            subject={{ dealId: id }}
            activities={activities}
            writePermission="deals:update"
          />
        </div>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <DealActions
                deal={deal}
                stages={stages}
                contacts={contacts}
                organizations={organizations}
                people={people}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {canAddTask && (
                <NewTaskForm
                  subject={{ dealId: id }}
                  people={people}
                  currentUserId={actorId(staff) ?? undefined}
                />
              )}
              {tasks.length === 0 ? (
                <TasksEmpty
                  description={
                    canAddTask ? "Nothing to do for this deal." : "Closed deals have no open tasks."
                  }
                />
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
