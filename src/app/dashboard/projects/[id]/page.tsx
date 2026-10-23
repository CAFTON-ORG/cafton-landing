import { TabCount } from "@/components/dashboard/shared/tab-count";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { EditorLayout } from "@/components/dashboard/shared/editor-layout";
import { Person } from "@/components/dashboard/shared/person";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import { Progress } from "@/components/dashboard/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dashboard/ui/tabs";
import { DetailsPanel, DetailsSection, Fact, Facts } from "@/features/crm/components/detail-parts";
import { listStaffOptions } from "@/features/crm/repository/pipeline";
import { ProjectActions } from "@/features/delivery/components/project-actions";
import { MilestonesPanel } from "@/features/delivery/components/milestones-panel";
import { ProjectStatusBadge } from "@/features/delivery/components/badges";
import { TasksPanel } from "@/features/delivery/components/tasks-panel";
import { CaseStudyCard } from "@/features/delivery/components/case-study-card";
import { FinancialsCard } from "@/features/delivery/components/financials-card";
import { ProjectTime } from "@/features/delivery/components/project-time";
import { TeamPanel } from "@/features/delivery/components/team-panel";
import {
  getProject,
  listMembers,
  getFinancials,
  listMilestones,
  listPortfolioOptions,
  listProjectTime,
  listTasks,
} from "@/features/delivery/repository";
import {
  formatMinutes,
  hoursUsage,
  isOpenProject,
  progressPercent,
} from "@/features/delivery/rules";
import { manilaDate } from "@/features/schedule/slots";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("projects:view");
  if (!staff) return <AccessDenied area="projects" />;

  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const showTime = can(staff, "time:view");
  const completed = project.status === "completed";
  const [members, milestones, tasks, people, timeEntries, financials, portfolio] =
    await Promise.all([
      listMembers(id),
      listMilestones(id),
      listTasks(id),
      listStaffOptions(),
      showTime ? listProjectTime(id) : [],
      showTime ? getFinancials(id) : null,
      completed ? listPortfolioOptions() : [],
    ]);
  const today = manilaDate(new Date());
  const open = isOpenProject(project.status);
  const progress = progressPercent(project.tasks);
  const usage = hoursUsage(project.budgetMinutes ?? null, project.loggedMinutes);
  const team = members.map((member) => ({
    id: member.profileId,
    name: member.name,
    avatarUrl: member.avatarUrl,
  }));

  return (
    <>
      <BackLink href="/dashboard/projects">All projects</BackLink>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            {project.reference}
            {project.clientName && ` · ${project.clientName}`}
          </p>
        </div>
        <ProjectActions project={project} people={people} />
      </div>

      <EditorLayout
        rail={
          <DetailsPanel>
            <DetailsSection title="Project">
              <Facts>
                <Fact label="Manager">
                  {project.manager && (
                    <Person name={project.manager.name} avatarUrl={project.manager.avatarUrl} />
                  )}
                </Fact>
                <Fact label="Start">{project.startDate && formatDate(project.startDate)}</Fact>
                <Fact label="Due">{project.dueDate && formatDate(project.dueDate)}</Fact>
                <Fact label="Completed">
                  {project.completedAt && formatDate(project.completedAt)}
                </Fact>
                <Fact label="Price">
                  {project.budgetMinor !== undefined &&
                    formatMinor(project.budgetMinor, project.currency)}
                </Fact>
              </Facts>
            </DetailsSection>
            <DetailsSection title="Client">
              <Facts>
                <Fact label="Client">{project.clientName}</Fact>
                <Fact label="Deal">
                  {project.dealId && (
                    <Link
                      className="underline underline-offset-4"
                      href={`/dashboard/crm/deals/${project.dealId}`}
                    >
                      {project.dealTitle}
                    </Link>
                  )}
                </Fact>
                <Fact label="Quote">{project.quoteReference}</Fact>
              </Facts>
            </DetailsSection>
          </DetailsPanel>
        }
      >
        <Tabs defaultValue="overview" className="min-w-0">
          <TabsList className="max-w-full [scrollbar-width:none] justify-start overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">
              Tasks
              <TabCount n={project.tasks.total - project.tasks.done} />
            </TabsTrigger>
            <TabsTrigger value="milestones">
              Milestones
              <TabCount n={milestones.length} />
            </TabsTrigger>
            {showTime && <TabsTrigger value="time">Time</TabsTrigger>}
            <TabsTrigger value="team">
              Team
              <TabCount n={members.length} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="grid gap-2">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Progress
                  </p>
                  <p className="text-2xl font-semibold tabular-nums">{progress}%</p>
                  <Progress value={progress} aria-label={`${progress}% of tasks done`} />
                  <p className="text-muted-foreground text-xs">
                    {project.tasks.total === 0
                      ? "No tasks yet."
                      : `${project.tasks.done} of ${project.tasks.total} tasks done`}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="grid gap-2">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Hours
                  </p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatMinutes(project.loggedMinutes)}
                  </p>
                  {project.budgetMinutes ? (
                    <>
                      <Progress
                        value={Math.min(usage.percent, 100)}
                        aria-label={`${usage.percent}% of the budgeted hours used`}
                      />
                      <p
                        className={
                          usage.over
                            ? "text-destructive text-xs font-medium"
                            : "text-muted-foreground text-xs"
                        }
                      >
                        {usage.over
                          ? `${formatMinutes(-(usage.remainingMinutes ?? 0))} over the ${formatMinutes(project.budgetMinutes)} the price assumes`
                          : `${formatMinutes(usage.remainingMinutes ?? 0)} left of ${formatMinutes(project.budgetMinutes)}`}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-xs">No hours budget set.</p>
                  )}
                  {project.pendingMinutes > 0 && (
                    <p className="text-muted-foreground text-xs">
                      {formatMinutes(project.pendingMinutes)} waiting for approval.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
            {financials && <FinancialsCard financials={financials} />}
            {completed && (
              <CaseStudyCard
                projectId={id}
                current={project.portfolioSlug}
                options={portfolio}
                canEdit={can(staff, "projects:update")}
              />
            )}
            {project.description && (
              <Card>
                <CardContent>
                  <p className="text-sm whitespace-pre-line">{project.description}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <TasksPanel
              projectId={id}
              tasks={tasks}
              milestones={milestones}
              team={team}
              today={today}
              open={open}
            />
          </TabsContent>
          <TabsContent value="milestones" className="mt-4">
            <MilestonesPanel
              projectId={id}
              currency={project.currency}
              milestones={milestones}
              today={today}
              open={open}
            />
          </TabsContent>
          {showTime && (
            <TabsContent value="time" className="mt-4">
              <ProjectTime entries={timeEntries} />
            </TabsContent>
          )}
          <TabsContent value="team" className="mt-4">
            <TeamPanel
              projectId={id}
              currency={project.currency}
              members={members}
              people={people}
              managerId={project.manager?.id}
            />
          </TabsContent>
        </Tabs>
      </EditorLayout>
    </>
  );
}
