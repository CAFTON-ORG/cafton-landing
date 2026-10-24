import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleCheck, Circle, CircleDashed } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { SITE_NAME } from "@/config/site";
import { getPublicProgress } from "@/features/delivery/repository/delivery";
import {
  MILESTONE_STATUS_LABEL,
  PROJECT_STATUS_LABEL,
  progressPercent,
  type MilestoneStatus,
} from "@/features/delivery/rules";

// A private link: never indexed, never cached.
export const metadata: Metadata = {
  title: "Project progress",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const day = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "UTC" }).format(
        new Date(`${value}T00:00:00Z`),
      )
    : "";

const STEP_ICON: Record<MilestoneStatus, typeof Circle> = {
  done: CircleCheck,
  in_progress: CircleDashed,
  pending: Circle,
};

/** What a client sees when they follow their project: where the work stands, and nothing internal. */
export default async function ProjectProgressPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const project = await getPublicProgress(token);
  if (!project) notFound();

  const percent = project.status === "completed" ? 100 : progressPercent(project.tasks);
  return (
    <main className="bg-background text-foreground min-h-svh px-4 py-10 sm:px-6">
      <div className="mx-auto grid max-w-2xl gap-6">
        <header className="flex items-center gap-3">
          <Logo size={36} aria-hidden="true" />
          <div>
            <p className="text-xl font-semibold tracking-wide">{SITE_NAME}</p>
            <p className="text-muted-foreground text-sm">Project {project.reference}</p>
          </div>
        </header>

        <section className="grid gap-1">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-muted-foreground text-sm">
            {project.clientName && `For ${project.clientName} · `}
            {PROJECT_STATUS_LABEL[project.status]}
            {project.dueDate && project.status !== "completed" && ` · due ${day(project.dueDate)}`}
            {project.completedAt && ` · completed ${day(project.completedAt.slice(0, 10))}`}
          </p>
        </section>

        <section aria-label="Overall progress" className="bg-card grid gap-2 rounded-xl border p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">Overall progress</p>
            <p className="text-2xl font-semibold tabular-nums">{percent}%</p>
          </div>
          <div
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Overall progress"
            className="bg-muted h-2 overflow-hidden rounded-full"
          >
            <div className="bg-primary h-full rounded-full" style={{ width: `${percent}%` }} />
          </div>
          {project.tasks.total > 0 && (
            <p className="text-muted-foreground text-sm">
              {project.tasks.done} of {project.tasks.total} pieces of work finished
            </p>
          )}
        </section>

        {project.milestones.length > 0 && (
          <section aria-labelledby="steps" className="bg-card rounded-xl border">
            <h2 id="steps" className="border-b px-4 py-3 text-sm font-semibold">
              Steps
            </h2>
            <ol className="divide-y">
              {project.milestones.map((milestone, index) => {
                const Icon = STEP_ICON[milestone.status];
                return (
                  <li key={index} className="flex items-start gap-3 px-4 py-3 text-sm">
                    <Icon
                      aria-hidden="true"
                      className={
                        milestone.status === "done"
                          ? "mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground mt-0.5 size-4 shrink-0"
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{milestone.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {MILESTONE_STATUS_LABEL[milestone.status]}
                        {milestone.status === "done" && milestone.completedAt
                          ? ` · ${day(milestone.completedAt.slice(0, 10))}`
                          : milestone.dueDate
                            ? ` · due ${day(milestone.dueDate)}`
                            : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <footer className="text-muted-foreground text-xs">
          Last updated {day(project.updatedAt.slice(0, 10))}. Questions? Reply to the email we sent
          you.
        </footer>
      </div>
    </main>
  );
}
