"use client";

import Link from "next/link";
import { Person } from "@/components/dashboard/shared/person";
import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { useState } from "react";
import { ListChecks, Plus, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { useCan } from "@/components/dashboard/layout/staff-context";
import { Button } from "@/components/dashboard/ui/button";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
import { Input } from "@/components/dashboard/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createTask, deleteTask, setTaskDone } from "../actions/activity";
import type { PersonRef, Subject, TaskView } from "../types/core";
import { UrgencyBadge } from "./badges";
import { NONE, PersonSelect } from "./owner-select";

const HREF = {
  lead: "/dashboard/crm/leads",
  contact: "/dashboard/crm/contacts",
  deal: "/dashboard/crm/deals",
} as const;

/** One row per task: tick it off, see when it is due, jump to what it is about. */
export function TaskRows({ tasks, showSubject }: { tasks: TaskView[]; showSubject?: boolean }) {
  const canUpdate = useCan("tasks:update");
  const { run, pending } = useServerAction();

  return (
    <ul className="divide-y">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-start gap-3 py-3">
          <Checkbox
            checked={!!task.doneAt}
            disabled={!canUpdate || pending}
            aria-label={`${task.doneAt ? "Reopen" : "Complete"}: ${task.title}`}
            onCheckedChange={(checked) => run(() => setTaskDone(task.id, checked === true))}
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm", task.doneAt && "text-muted-foreground line-through")}>
              {task.title}
            </p>
            <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <UrgencyBadge dueAt={task.dueAt} doneAt={task.doneAt} />
              {task.dueAt && !task.doneAt && <span>{formatDate(task.dueAt)}</span>}
              {task.assigneeName && (
                <Person
                  name={task.assigneeName}
                  avatarUrl={task.assigneeAvatar}
                  className="text-foreground/80"
                />
              )}
              {showSubject && task.subject && (
                <Link
                  href={`${HREF[task.subject.kind]}/${task.subject.id}`}
                  className="underline underline-offset-4"
                >
                  {task.subject.label}
                </Link>
              )}
            </p>
          </div>
          {canUpdate && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete task: ${task.title}`}
              disabled={pending}
              onClick={() => run(() => deleteTask(task.id), { success: "Task deleted." })}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Inline form: a title, a due date and an assignee. `subject` is omitted for a personal task. */
export function NewTaskForm({
  subject,
  people,
  currentUserId,
  className,
  layout = "stacked",
}: {
  subject?: Subject;
  people: PersonRef[];
  currentUserId?: string;
  className?: string;
  /** "stacked" fits a narrow side card; "inline" is one row on a full-width page. */
  layout?: "stacked" | "inline";
}) {
  const canCreate = useCan("tasks:create");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [assignee, setAssignee] = useState(currentUserId ?? "");
  const [error, setError] = useState("");
  const { run, pending } = useServerAction();

  if (!canCreate) return null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    run(() => createTask({ title, due, assigneeId: assignee || NONE, subject }), {
      success: "Task added.",
      onSuccess: () => {
        setTitle("");
        setDue("");
      },
      onFieldErrors: (errors) => setError(Object.values(errors)[0] ?? ""),
    });
  }

  return (
    <form onSubmit={submit} noValidate className={cn("grid gap-2", className)}>
      <div className={cn("grid gap-2", layout === "inline" && "sm:grid-cols-[1fr_auto_auto_auto]")}>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label="Task"
          aria-invalid={!!error}
          placeholder="Add a task, e.g. Send the proposal"
        />
        <div className={cn("grid grid-cols-2 gap-2", layout === "inline" && "contents")}>
          <DatePicker
            value={due}
            onChange={setDue}
            placeholder="Due date"
            clearable
            className={layout === "inline" ? "sm:w-44" : undefined}
          />
          <PersonSelect
            value={assignee}
            onChange={setAssignee}
            people={people}
            aria-label="Assign to"
            className={layout === "inline" ? "sm:w-40" : "w-full min-w-0"}
          />
        </div>
        <Button
          type="submit"
          disabled={pending || !title.trim()}
          className={layout === "stacked" ? "justify-self-end" : undefined}
        >
          <Plus aria-hidden="true" /> Add task
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </form>
  );
}

export function TasksEmpty({
  title = "No tasks",
  description,
}: {
  title?: string;
  description: string;
}) {
  return <EmptyState compact icon={ListChecks} title={title} description={description} />;
}
