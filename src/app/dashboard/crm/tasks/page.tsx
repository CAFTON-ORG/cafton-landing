import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { SegmentedNav } from "@/components/dashboard/shared/segmented-nav";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import { NewTaskForm, TaskRows, TasksEmpty } from "@/features/crm/components/task-list";
import { listStaffOptions } from "@/features/crm/repository/pipeline";
import { listTasks } from "@/features/crm/repository/tasks";
import { actorId } from "@/lib/actions";
import { requirePageAccess } from "@/lib/auth/dal";

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
  return (
    <>
      <PageHeader
        title="Tasks"
        description="Follow-ups and to-dos across leads, contacts and deals."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SegmentedNav
          label="Task state"
          items={STATES.map((entry) => ({
            href: href({ state: entry.value }),
            label: entry.label,
            active: state === entry.value,
          }))}
        />
        <SegmentedNav
          label="Whose tasks"
          items={[
            { href: href({ scope: "mine" }), label: "Mine", active: scope === "mine" },
            { href: href({ scope: "all" }), label: "Everyone", active: scope === "all" },
          ]}
        />
      </div>

      <Card>
        <CardContent className="grid gap-3">
          <NewTaskForm layout="inline" people={people} currentUserId={staffId ?? undefined} />
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
