"use client";

import Link from "next/link";
import { FolderKanban } from "lucide-react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { useTableParams } from "@/components/dashboard/data-table/use-table-params";
import { IconTile } from "@/components/dashboard/shared/icon-tile";
import { Person } from "@/components/dashboard/shared/person";
import { Progress } from "@/components/dashboard/ui/progress";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import type { Page } from "@/lib/pagination";
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL, progressPercent } from "../rules";
import { PROJECTS_TABLE } from "../table";
import type { ProjectRow } from "../types";
import { ProjectStatusBadge } from "./badges";

const columns: Column<ProjectRow>[] = [
  {
    id: "name",
    header: "Project",
    sortable: true,
    cell: (project) => (
      <div className="flex min-w-0 items-center gap-3">
        <IconTile icon={FolderKanban} />
        <div className="min-w-0">
          <Link
            href={`/dashboard/projects/${project.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {project.name}
          </Link>
          <p className="text-muted-foreground truncate text-xs">
            {project.reference}
            {project.clientName && ` · ${project.clientName}`}
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    sortable: true,
    cell: (project) => <ProjectStatusBadge status={project.status} />,
  },
  {
    id: "progress",
    header: "Progress",
    hideBelow: "md",
    cell: (project) => {
      const percent = progressPercent(project.tasks);
      return project.tasks.total === 0 ? (
        <span className="text-muted-foreground text-xs">No tasks yet</span>
      ) : (
        <div className="grid w-32 gap-1">
          <Progress value={percent} aria-label={`${percent}% of tasks done`} />
          <span className="text-muted-foreground text-xs tabular-nums">
            {project.tasks.done} of {project.tasks.total} tasks
          </span>
        </div>
      );
    },
  },
  {
    id: "manager",
    header: "Manager",
    hideBelow: "lg",
    cell: (project) => (
      <Person
        name={project.manager?.name}
        avatarUrl={project.manager?.avatarUrl}
        fallback="No manager"
      />
    ),
  },
  {
    id: "due",
    header: "Due",
    sortable: true,
    hideBelow: "lg",
    cell: (project) =>
      project.dueDate ? (
        formatDate(project.dueDate)
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "budget",
    header: "Price",
    hideBelow: "xl",
    cell: (project) =>
      project.budgetMinor !== undefined ? (
        <span className="tabular-nums">
          {formatMinor(project.budgetMinor, project.currency, { compact: true })}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export function ProjectsTable({ page }: { page: Page<ProjectRow> }) {
  const table = useTableParams(PROJECTS_TABLE);
  return (
    <ResourceTable
      table={table}
      page={page}
      columns={columns}
      getRowId={(project) => project.id}
      caption="Projects"
      searchLabel="Search projects"
      searchPlaceholder="Search by name, number or client…"
      filters={[
        {
          id: "status",
          label: "Status",
          allLabel: "Any status",
          options: PROJECT_STATUSES.map((status) => ({
            value: status,
            label: PROJECT_STATUS_LABEL[status],
          })),
        },
        {
          id: "manager",
          label: "Manager",
          allLabel: "Anyone",
          options: [
            { value: "me", label: "Mine" },
            { value: "none", label: "No manager" },
          ],
        },
      ]}
      emptyIcon={FolderKanban}
      emptyTitle="No projects yet"
      emptyDescription="A project starts when a client accepts a quote. You can also start one by hand."
    />
  );
}
