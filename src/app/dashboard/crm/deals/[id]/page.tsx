import { TabCount } from "@/components/dashboard/shared/tab-count";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { EditorLayout } from "@/components/dashboard/shared/editor-layout";
import { Person } from "@/components/dashboard/shared/person";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dashboard/ui/tabs";
import { FilesPanel } from "@/features/crm/components/files-panel";
import { CustomFieldsForm } from "@/features/crm/components/custom-fields-form";
import { listCustomFields } from "@/features/crm/repository/custom-fields";
import { listFiles } from "@/features/crm/repository/files";
import { getServices } from "@/features/cms/repository/services";
import { ActivityTimeline } from "@/features/crm/components/activity-timeline";
import { StageBadge } from "@/features/crm/components/badges";
import { DealActions } from "@/features/crm/components/deal-actions";
import { DetailsPanel, DetailsSection, Fact, Facts } from "@/features/crm/components/detail-parts";
import { EnquiryAnswers } from "@/features/crm/components/enquiry-answers";
import { StageStepper } from "@/features/crm/components/stage-stepper";
import { TagsEditor } from "@/features/crm/components/tags-editor";
import { NewTaskForm, TaskRows, TasksEmpty } from "@/features/crm/components/task-list";
import { parseKeyLines } from "@/features/crm/enquiry-text";
import { listActivities } from "@/features/crm/repository/activity";
import { listContactOptions } from "@/features/crm/repository/contacts";
import { getDeal } from "@/features/crm/repository/deals";
import { getLead } from "@/features/crm/repository/leads";
import { listOrganizationOptions } from "@/features/crm/repository/organizations";
import { listStages, listStaffOptions } from "@/features/crm/repository/pipeline";
import { listTagOptions } from "@/features/crm/repository/tags";
import { listTasksFor } from "@/features/crm/repository/tasks";
import { checkAddTaskToDeal } from "@/features/crm/rules";
import { checkReopenSigned } from "@/features/contracts/rules";
import { checkWinQuotes } from "@/features/sales/rules";
import { DealContractsPanel } from "@/features/contracts/components/deal-contracts-panel";
import {
  acceptedQuotesForDeal,
  listContractsForDeal,
  listTemplates,
} from "@/features/contracts/repository";
import { DealQuotesPanel } from "@/features/sales/components/deal-quotes-panel";
import { listQuotesForDeal } from "@/features/sales/repository";
import { can } from "@/lib/auth/dal";
import { MeetingsPanel } from "@/features/schedule/components/meetings-panel";
import { listMeetingsFor } from "@/features/schedule/repository";
import { actorId } from "@/lib/actions";
import { requirePageAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";

export const metadata: Metadata = { title: "Deal" };

const text = (value: unknown) => (typeof value === "string" ? value : "");

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("deals:view");
  if (!staff) return <AccessDenied area="deals" />;

  const { id } = await params;
  const deal = await getDeal(id);
  if (!deal) notFound();

  // The rest is asked for at once: each round trip to the database is slow.
  const [
    stages,
    activities,
    tasks,
    contacts,
    organizations,
    people,
    meetings,
    tagOptions,
    origin,
    quotes,
    contracts,
    contractTemplates,
    acceptedQuotes,
    files,
    customFields,
  ] = await Promise.all([
    listStages(deal.pipelineId),
    listActivities({ dealId: id }),
    listTasksFor({ dealId: id }),
    listContactOptions(),
    listOrganizationOptions(),
    listStaffOptions(),
    listMeetingsFor({ dealId: id }),
    listTagOptions("deal"),
    deal.leadId ? getLead(deal.leadId) : Promise.resolve(null),
    can(staff, "quotes:view") ? listQuotesForDeal(id) : Promise.resolve([]),
    can(staff, "contracts:view") ? listContractsForDeal(id) : Promise.resolve([]),
    can(staff, "contracts:create") ? listTemplates({ activeOnly: true }) : Promise.resolve([]),
    can(staff, "contracts:create") ? acceptedQuotesForDeal(id) : Promise.resolve([]),
    listFiles({ dealId: id }),
    listCustomFields("deal"),
  ]);
  const services = origin ? await getServices() : [];
  const canAddTask = !checkAddTaskToDeal({
    stageKind: deal.stageKind,
    amountMinor: deal.amountMinor,
  });
  const openTasks = tasks.filter((task) => !task.doneAt).length;

  // A deal made from an enquiry carries the form's answers as plain text in its description.
  // Show them as the structured enquiry (from the lead) rather than a wall of "Label: value" lines.
  const pairs = parseKeyLines(deal.description ?? "");
  const isEnquiryText = pairs.length >= 3;
  const goalsArea = origin
    ? services.find((pillar) => pillar.slug === text(origin.answers.goalsCategory))?.title
    : undefined;
  const closed = deal.stageKind !== "open";
  // The same rules the actions enforce, shown up front (the lists are empty for staff who can't
  // see quotes or contracts, so the server remains the real check).
  const winBlocked = checkWinQuotes(quotes);
  const reopenBlocked = checkReopenSigned(contracts.map((contract) => contract.status));

  return (
    <>
      <BackLink href="/dashboard/crm/deals">All deals</BackLink>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{deal.title}</h1>
            <StageBadge deal={deal} />
          </div>
          <p className="text-muted-foreground text-sm">
            {deal.reference} · {formatMinor(deal.amountMinor, deal.currency)}
            {deal.stageKind === "open" && ` · ${deal.probability}% likely`}
          </p>
        </div>
        <DealActions
          deal={deal}
          contacts={contacts}
          organizations={organizations}
          people={people}
          winBlocked={winBlocked}
          reopenBlocked={reopenBlocked}
        />
      </div>

      <div className="mb-4">
        <StageStepper
          dealId={deal.id}
          stages={stages}
          currentId={deal.stageId}
          closedKind={deal.stageKind}
          amountMinor={deal.amountMinor}
        />
      </div>

      <EditorLayout
        rail={
          <DetailsPanel>
            <DetailsSection title="Deal">
              <Facts>
                <Fact label="Value">{formatMinor(deal.amountMinor, deal.currency)}</Fact>
                <Fact label="Expected close">
                  {deal.expectedCloseDate && formatDate(deal.expectedCloseDate)}
                </Fact>
                <Fact label="Source">{deal.source}</Fact>
                <Fact label="Won on">{deal.wonAt && formatDate(deal.wonAt)}</Fact>
                <Fact label="Lost on">{deal.lostAt && formatDate(deal.lostAt)}</Fact>
                <Fact label="Why it was lost">{deal.lostReason}</Fact>
              </Facts>
            </DetailsSection>
            <DetailsSection title="People">
              <Facts>
                <Fact label="Owner">
                  <Person name={deal.ownerName} avatarUrl={deal.ownerAvatar} />
                </Fact>
                <Fact label="Contact">
                  <Person
                    name={deal.contactName}
                    href={`/dashboard/crm/contacts/${deal.contactId}`}
                  />
                </Fact>
                <Fact label="Organization">
                  {deal.organizationId && (
                    <Link
                      className="underline underline-offset-4"
                      href={`/dashboard/crm/organizations/${deal.organizationId}`}
                    >
                      {deal.organizationName}
                    </Link>
                  )}
                </Fact>
                <Fact label="Enquiry">
                  {deal.leadId && (
                    <Link
                      className="underline underline-offset-4"
                      href={`/dashboard/crm/leads/${deal.leadId}`}
                    >
                      View the original enquiry
                    </Link>
                  )}
                </Fact>
              </Facts>
            </DetailsSection>
            {customFields.length > 0 && (
              <DetailsSection title="Custom fields">
                <CustomFieldsForm entity="deal" id={id} defs={customFields} values={deal.custom} />
              </DetailsSection>
            )}
            <DetailsSection title="Tags">
              <TagsEditor kind="deal" id={id} initial={deal.tags} suggestions={tagOptions} />
            </DetailsSection>
          </DetailsPanel>
        }
      >
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            {can(staff, "quotes:view") && (
              <TabsTrigger value="quotes">
                Quotes
                <TabCount n={quotes.filter((q) => q.status !== "superseded").length} />
              </TabsTrigger>
            )}
            {can(staff, "contracts:view") && (
              <TabsTrigger value="contracts">
                Contracts
                <TabCount n={contracts.length} />
              </TabsTrigger>
            )}
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

          <TabsContent value="overview" className="mt-4 grid gap-4">
            {origin ? (
              <EnquiryAnswers answers={origin.answers} goalsArea={goalsArea} />
            ) : isEnquiryText ? (
              <Card>
                <CardContent>
                  <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {pairs.map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-muted-foreground text-xs">{label}</dt>
                        <dd className="text-sm break-words">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            ) : null}
            {deal.description && !isEnquiryText && (
              <Card>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{deal.description}</p>
                </CardContent>
              </Card>
            )}
            {!origin && !deal.description && (
              <p className="text-muted-foreground text-sm">
                {closed ? "Nothing more to show." : "No description yet. Add one with Edit."}
              </p>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ActivityTimeline
              subject={{ dealId: id }}
              activities={activities}
              writePermission="deals:update"
              currentUserId={actorId(staff) ?? undefined}
              recipient={{ name: deal.contactName }}
            />
          </TabsContent>

          {can(staff, "quotes:view") && (
            <TabsContent value="quotes" className="mt-4">
              <DealQuotesPanel dealId={id} quotes={quotes} closedLost={deal.stageKind === "lost"} />
            </TabsContent>
          )}

          {can(staff, "contracts:view") && (
            <TabsContent value="contracts" className="mt-4">
              <DealContractsPanel
                dealId={id}
                contracts={contracts}
                templates={contractTemplates}
                quotes={acceptedQuotes}
                closedLost={deal.stageKind === "lost"}
              />
            </TabsContent>
          )}

          <TabsContent value="tasks" className="mt-4">
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
                      canAddTask
                        ? "Nothing to do for this deal."
                        : "Closed deals have no open tasks."
                    }
                  />
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
                dealId: id,
                title: `Meeting about ${deal.title}`,
                attendeeName: deal.contactName ?? undefined,
              }}
            />
          </TabsContent>
          <TabsContent value="files" className="mt-4">
            <FilesPanel
              subject={{ dealId: id }}
              files={files}
              currentUserId={actorId(staff) ?? undefined}
            />
          </TabsContent>
        </Tabs>
      </EditorLayout>
    </>
  );
}
