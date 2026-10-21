import type { Metadata } from "next";
import Link from "next/link";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import { NewTaskForm, TaskRows, TasksEmpty } from "@/features/crm/components/task-list";
import { listStaffOptions } from "@/features/crm/repository/pipeline";
import { listTasks } from "@/features/crm/repository/tasks";
import { actorId } from "@/lib/actions";
import { requirePageAccess } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tasks" };

const STATES = [
  { value: "open", label: "Open" },
  { value: "overdue", label: "Overdue" },
  { value: "done", label: "Done" },
] as const;

const EMPTY = {
  open: "Nothing is waiting on you. Add a follow-up above, or open a lead or deal to add one there.",
  overdue: "Nothing is overdue. Nicely done.",
  done: "No finished tasks yet.",
} as const;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("tasks:view");
  if (!staff) return <AccessDenied area="tasks" />;

  const raw = await searchParams;
  const state = STATES.find((entry) => entry.value === raw.state)?.value ?? "open";
  const scope = raw.scope === "all" ? "all" : "mine";
  const staffId = actorId(staff);

  const [tasks, people] = await Promise.all([
    listTasks({ scope, state, staffId }),
    listStaffOptions(),
  ]);

  const href = (next: { state?: string; scope?: string }) => {
    const search = new URLSearchParams();
    const s = next.state ?? state;
    const c = next.scope ?? scope;
    if (s !== "open") search.set("state", s);
    if (c !== "mine") search.set("scope", c);
    const query = search.toString();
    return query ? `/dashboard/crm/tasks?${query}` : "/dashboard/crm/tasks";
  };
  const tab = (active: boolean) =>
    cn(
      "inline-flex h-8 items-center rounded-md px-2.5 text-sm font-medium",
      active
        ? "bg-background text-foreground shadow-xs"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Follow-ups and to-dos across leads, contacts and deals."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav aria-label="Task state" className="bg-muted inline-flex rounded-lg p-0.5">
          {STATES.map((entry) => (
            <Link
              key={entry.value}
              href={href({ state: entry.value })}
              className={tab(state === entry.value)}
              aria-current={state === entry.value ? "page" : undefined}
            >
              {entry.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Whose tasks" className="bg-muted inline-flex rounded-lg p-0.5">
          <Link
            href={href({ scope: "mine" })}
            className={tab(scope === "mine")}
            aria-current={scope === "mine" ? "page" : undefined}
          >
            Mine
          </Link>
          <Link
            href={href({ scope: "all" })}
            className={tab(scope === "all")}
            aria-current={scope === "all" ? "page" : undefined}
          >
            Everyone
          </Link>
        </nav>
      </div>

      <Card>
        <CardContent className="grid gap-3">
          <NewTaskForm people={people} currentUserId={staffId ?? undefined} />
          {tasks.length === 0 ? (
            <TasksEmpty title="All clear" description={EMPTY[state]} />
          ) : (
            <TaskRows tasks={tasks} showSubject />
          )}
        </CardContent>
      </Card>
    </>
  );
}
