import type { Metadata } from "next";
import { AlarmClock, FolderKanban, Plus, Rocket } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { StatCard } from "@/components/dashboard/shared/stat-card";
import { Button } from "@/components/dashboard/ui/button";
import { listStaffOptions } from "@/features/crm/repository/pipeline";
import { ProjectDialog } from "@/features/delivery/components/project-dialog";
import { ProjectsTable } from "@/features/delivery/components/projects-table";
import {
  listDealsReadyForProject,
  listProjects,
  projectTotals,
} from "@/features/delivery/repository";
import { PROJECTS_TABLE } from "@/features/delivery/table";
import { manilaDate } from "@/features/schedule/slots";
import { actorId } from "@/lib/actions";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { parseTableParams, searchParamsFromRecord } from "@/lib/table-params";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("projects:view");
  if (!staff) return <AccessDenied area="projects" />;

  const params = parseTableParams(searchParamsFromRecord(await searchParams), PROJECTS_TABLE);
  const canCreate = can(staff, "projects:create");
  const [page, totals, people, deals] = await Promise.all([
    listProjects(params, actorId(staff)),
    projectTotals(manilaDate(new Date())),
    canCreate ? listStaffOptions() : [],
    canCreate ? listDealsReadyForProject() : [],
  ]);

  return (
    <>
      <PageHeader
        title="Projects"
        description="Client work from start to delivery. A project starts when a client accepts a quote."
        action={
          canCreate ? (
            <ProjectDialog
              people={people}
              deals={deals}
              trigger={
                <Button>
                  <Plus aria-hidden="true" /> Start a project
                </Button>
              }
            />
          ) : undefined
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="In progress"
          value={String(totals.active)}
          hint={
            totals.planned > 0
              ? `${totals.planned} more waiting to start`
              : "Nothing waiting to start"
          }
          icon={Rocket}
        />
        <StatCard
          label="Overdue"
          value={String(totals.overdue)}
          hint={totals.overdue > 0 ? "Past their due date" : "All on schedule"}
          icon={AlarmClock}
        />
        <StatCard
          label="Time to approve"
          value={String(totals.pendingApprovals)}
          hint={totals.pendingApprovals > 0 ? "Entries waiting for review" : "Nothing waiting"}
          icon={FolderKanban}
        />
      </div>
      <ProjectsTable page={page} />
    </>
  );
}
