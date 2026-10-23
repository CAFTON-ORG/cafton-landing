"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Pencil, Plus, Send, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import { Input } from "@/components/dashboard/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteTime, logTime, submitWeek } from "../actions/time";
import { canEditEntry, durationInput, formatMinutes, weekDates } from "../rules";
import type { LoggableProject } from "../repository";
import type { TimeEntryView } from "../types";
import { TimeStatusBadge } from "./badges";

interface Draft {
  id?: string;
  projectId: string;
  taskId: string;
  workDate: string;
  duration: string;
  note: string;
  billable: boolean;
}

const NO_TASK = "none";

const dayLabel = (date: string) =>
  new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

/**
 * One person's week: the hours they logged, a day at a time, and the button that sends the week
 * for approval. Entries stay editable until they are approved; sent-back time says why.
 */
export function Timesheet({
  entries,
  projects,
  weekStart,
  today,
  previousWeek,
  nextWeek,
  thisWeek,
}: {
  entries: TimeEntryView[];
  projects: LoggableProject[];
  weekStart: string;
  today: string;
  previousWeek: string;
  nextWeek: string;
  thisWeek: string;
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<TimeEntryView | null>(null);

  const days = weekDates(weekStart);
  const total = entries.reduce((sum, entry) => sum + entry.minutes, 0);
  const sendable = entries.filter((entry) => canEditEntry(entry.status));
  const waiting = entries.filter((entry) => entry.status === "submitted").length;
  const approved = entries.filter((entry) => entry.status === "approved").length;

  function open(workDate: string, entry?: TimeEntryView) {
    setErrors({});
    setDraft(
      entry
        ? {
            id: entry.id,
            projectId: entry.projectId,
            taskId: entry.taskId ?? "",
            workDate: entry.workDate,
            duration: durationInput(entry.minutes),
            note: entry.note ?? "",
            billable: entry.billable,
          }
        : {
            projectId: projects[0]?.id ?? "",
            taskId: "",
            workDate,
            duration: "",
            note: "",
            billable: true,
          },
    );
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setErrors({});
    run(() => logTime({ ...draft, taskId: draft.taskId || "none" }), {
      success: draft.id ? "Time updated." : "Time logged.",
      onSuccess: () => {
        setDraft(null);
        router.refresh();
      },
      onFieldErrors: setErrors,
    });
  }

  const projectsForDraft = draft?.id
    ? // Fixing an entry keeps its project even if the project has since paused.
      projects.some((project) => project.id === draft.projectId)
      ? projects
      : [
          ...projects,
          {
            id: draft.projectId,
            name: entries.find((entry) => entry.id === draft.id)?.projectName ?? "Project",
            reference: "",
            tasks: [],
          },
        ]
    : projects;
  const tasks = projectsForDraft.find((project) => project.id === draft?.projectId)?.tasks ?? [];

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle>
            Week of {formatDate(weekStart)}
            <span className="text-muted-foreground ml-2 text-sm font-normal tabular-nums">
              {formatMinutes(total)} logged
            </span>
          </CardTitle>
          <CardDescription>
            {waiting > 0 && `${waiting} waiting for approval. `}
            {approved > 0 && `${approved} approved. `}
            {sendable.length > 0 && `${sendable.length} not sent yet.`}
            {entries.length === 0 && "Nothing logged this week."}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1" role="group" aria-label="Choose a week">
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Previous week"
              nativeButton={false}
              render={<Link href={`/dashboard/time?week=${previousWeek}`} />}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/dashboard/time?week=${thisWeek}`} />}
              disabled={weekStart === thisWeek}
            >
              This week
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Next week"
              nativeButton={false}
              render={<Link href={`/dashboard/time?week=${nextWeek}`} />}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => open(today >= days[0] && today <= days[6] ? today : days[0])}
            disabled={projects.length === 0}
          >
            <Plus aria-hidden="true" /> Log time
          </Button>
          <Button
            size="sm"
            disabled={pending || sendable.length === 0}
            onClick={() =>
              run(() => submitWeek(weekStart), {
                success: (data) =>
                  `Sent ${data?.count ?? 0} ${data?.count === 1 ? "entry" : "entries"} for approval.`,
                onSuccess: () => router.refresh(),
              })
            }
          >
            <Send aria-hidden="true" /> Submit week
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {projects.length === 0 && (
          <EmptyState
            compact
            icon={Clock}
            title="No projects to log time on"
            description="You can log hours on projects that are in progress and have you on the team."
          />
        )}
        {projects.length > 0 &&
          days.map((date) => {
            const todays = entries.filter((entry) => entry.workDate === date);
            const sum = todays.reduce((acc, entry) => acc + entry.minutes, 0);
            return (
              <section key={date} aria-label={dayLabel(date)}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <h3 className={cn("text-sm font-semibold", date === today && "text-primary")}>
                    {dayLabel(date)}
                    {date === today && (
                      <span className="text-muted-foreground ml-2 text-xs font-normal">Today</span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {sum > 0 ? formatMinutes(sum) : ""}
                    </span>
                    {date <= today && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Log time on ${dayLabel(date)}`}
                        onClick={() => open(date)}
                      >
                        <Plus aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>
                {todays.length > 0 && (
                  <ul className="divide-y rounded-lg border">
                    {todays.map((entry) => (
                      <li key={entry.id} className="flex flex-wrap items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {entry.projectName}
                            {entry.taskTitle && (
                              <span className="text-muted-foreground font-normal">
                                {" "}
                                · {entry.taskTitle}
                              </span>
                            )}
                          </p>
                          {entry.note && (
                            <p className="text-muted-foreground text-xs">{entry.note}</p>
                          )}
                          {entry.status === "rejected" && entry.reviewNote && (
                            <p className="text-destructive mt-0.5 text-xs">
                              Sent back{entry.reviewedByName ? ` by ${entry.reviewedByName}` : ""}:{" "}
                              {entry.reviewNote}
                            </p>
                          )}
                        </div>
                        {!entry.billable && (
                          <span className="text-muted-foreground text-xs">Not billable</span>
                        )}
                        <span className="text-sm font-medium tabular-nums">
                          {formatMinutes(entry.minutes)}
                        </span>
                        <TimeStatusBadge status={entry.status} />
                        {canEditEntry(entry.status) && (
                          <div className="flex gap-1">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Edit this entry"
                              onClick={() => open(date, entry)}
                            >
                              <Pencil aria-hidden="true" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Delete this entry"
                              disabled={pending}
                              onClick={() => setRemoving(entry)}
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
      </CardContent>

      <Dialog open={draft !== null} onOpenChange={(next) => !next && !pending && setDraft(null)}>
        <DialogContent scrollable>
          {draft && (
            <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
              <DialogHeader>
                <DialogTitle>{draft.id ? "Edit time" : "Log time"}</DialogTitle>
                <DialogDescription>
                  Enter the time like 1.5, 1:30 or 90m. A day can&apos;t have more than 24 hours.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="grid gap-4">
                <Field
                  id="time-project"
                  label="Project"
                  required
                  error={errors.projectId ?? errors.form}
                >
                  <Select
                    value={draft.projectId}
                    disabled={!!draft.id}
                    onValueChange={(next) =>
                      setDraft({ ...draft, projectId: String(next), taskId: "" })
                    }
                  >
                    <SelectTrigger id="time-project" className="w-full">
                      <SelectValue>
                        {(value: string) =>
                          projectsForDraft.find((project) => project.id === value)?.name ??
                          "Choose a project"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {projectsForDraft.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {tasks.length > 0 && (
                  <Field id="time-task" label="Task" error={errors.taskId}>
                    <Select
                      value={draft.taskId || NO_TASK}
                      onValueChange={(next) =>
                        setDraft({ ...draft, taskId: next === NO_TASK ? "" : String(next) })
                      }
                    >
                      <SelectTrigger id="time-task" className="w-full">
                        <SelectValue>
                          {(value: string) =>
                            tasks.find((task) => task.id === value)?.title ?? "No particular task"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_TASK}>No particular task</SelectItem>
                        {tasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="time-date" label="Day" required error={errors.workDate}>
                    <DatePicker
                      id="time-date"
                      value={draft.workDate}
                      onChange={(value) => setDraft({ ...draft, workDate: value })}
                    />
                  </Field>
                  <Field id="time-duration" label="Time" required error={errors.duration}>
                    <Input
                      id="time-duration"
                      value={draft.duration}
                      onChange={(event) => setDraft({ ...draft, duration: event.target.value })}
                      aria-invalid={!!errors.duration}
                      placeholder="e.g. 1.5 or 1:30"
                      autoComplete="off"
                    />
                  </Field>
                </div>
                <Field id="time-note" label="What did you do?" error={errors.note}>
                  <Textarea
                    id="time-note"
                    rows={3}
                    value={draft.note}
                    onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                  />
                </Field>
                <label className="flex items-center gap-2.5 text-sm">
                  <Checkbox
                    checked={draft.billable}
                    onCheckedChange={(checked) =>
                      setDraft({ ...draft, billable: checked === true })
                    }
                  />
                  Billable to the client
                </label>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setDraft(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={pending || !draft.projectId || !draft.duration.trim()}
                >
                  {pending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => !next && setRemoving(null)}
        title="Delete this entry?"
        description={
          removing
            ? `${formatMinutes(removing.minutes)} on ${removing.projectName}, ${formatDate(removing.workDate)}.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        pending={pending}
        onConfirm={() =>
          removing &&
          run(() => deleteTime(removing.id), {
            success: "Entry deleted.",
            onSuccess: () => {
              setRemoving(null);
              router.refresh();
            },
          })
        }
      />
    </Card>
  );
}
