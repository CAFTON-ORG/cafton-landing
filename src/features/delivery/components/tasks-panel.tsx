"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  GripVertical,
  MessageSquare,
  LayoutList,
  ListChecks,
  Pencil,
  Plus,
  SquareKanban,
  Trash2,
} from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Field } from "@/components/dashboard/shared/field";
import { Person } from "@/components/dashboard/shared/person";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
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
import { PersonSelect } from "@/features/crm/components/owner-select";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteTask, moveTask, saveTask } from "../actions/work";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABEL,
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  durationInput,
  formatMinutes,
  isOverdue,
  type TaskPriority,
  type TaskStatus,
} from "../rules";
import type { MilestoneView, PersonRef, TaskView } from "../types";
import { TaskPriorityBadge, TaskStatusBadge } from "./badges";
import { TaskComments } from "./task-comments";

interface Draft {
  id?: string;
  title: string;
  description: string;
  milestoneId: string;
  assigneeId: string;
  priority: TaskPriority;
  dueDate: string;
  estimate: string;
}
const blank: Draft = {
  title: "",
  description: "",
  milestoneId: "",
  assigneeId: "",
  priority: "normal",
  dueDate: "",
  estimate: "",
};
const NO_MILESTONE = "none";

type View = "list" | "board";

/**
 * The project's work as a list or a board. On the board a card moves by its handle (mouse, touch,
 * or keyboard: focus the handle, press Space, use the arrow keys, press Space again) or from the
 * status menu on the card, which is what a phone uses.
 */
export function TasksPanel({
  projectId,
  tasks,
  milestones,
  team,
  today,
  open,
  me,
}: {
  projectId: string;
  tasks: TaskView[];
  milestones: MilestoneView[];
  /** The people on the project's team: the only ones a task can be given to. */
  team: PersonRef[];
  today: string;
  open: boolean;
  /** The signed-in person, so their own comments can be removed. */
  me?: string;
}) {
  const router = useRouter();
  const canUpdate = useCan("projects:update") && open;
  const { run, pending } = useServerAction();
  const [view, setView] = useState<View>("list");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<TaskView | null>(null);
  const [placed, setPlaced] = useState<Record<string, TaskStatus>>({});
  const [dragging, setDragging] = useState<TaskView | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const statusOf = (task: TaskView) => placed[task.id] ?? task.status;
  const byStatus = useMemo(() => {
    const map = new Map<TaskStatus, TaskView[]>(TASK_STATUSES.map((status) => [status, []]));
    for (const task of tasks) map.get(placed[task.id] ?? task.status)?.push(task);
    return map;
  }, [tasks, placed]);

  function edit(task?: TaskView) {
    setErrors({});
    setDraft(
      task
        ? {
            id: task.id,
            title: task.title,
            description: task.description ?? "",
            milestoneId: task.milestoneId ?? "",
            assigneeId: task.assignee?.id ?? "",
            priority: task.priority,
            dueDate: task.dueDate ?? "",
            estimate: task.estimateMinutes ? durationInput(task.estimateMinutes) : "",
          }
        : blank,
    );
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setErrors({});
    run(
      () =>
        saveTask({
          ...draft,
          projectId,
          milestoneId: draft.milestoneId || "none",
          assigneeId: draft.assigneeId || "none",
        }),
      {
        success: draft.id ? "Task updated." : "Task added.",
        onSuccess: () => {
          setDraft(null);
          router.refresh();
        },
        onFieldErrors: setErrors,
      },
    );
  }

  function move(task: TaskView, status: TaskStatus, beforeId?: string) {
    if (status === statusOf(task) && !beforeId) return;
    setPlaced((current) => ({ ...current, [task.id]: status }));
    run(() => moveTask({ id: task.id, status, beforeId }), {
      onSuccess: () => {
        router.refresh();
        setPlaced((current) =>
          Object.fromEntries(Object.entries(current).filter(([id]) => id !== task.id)),
        );
      },
      onFieldErrors: () => undefined,
    });
    // A refusal leaves the card where the server has it.
    setTimeout(
      () =>
        setPlaced((current) =>
          Object.fromEntries(Object.entries(current).filter(([id]) => id !== task.id)),
        ),
      4000,
    );
  }

  function onDragEnd(event: DragEndEvent) {
    setDragging(null);
    const task = tasks.find((candidate) => candidate.id === event.active.id);
    const over = event.over?.id ? String(event.over.id) : null;
    if (!task || !over) return;
    if (over.startsWith("col:")) {
      move(task, over.slice(4) as TaskStatus);
      return;
    }
    const target = tasks.find((candidate) => candidate.id === over);
    if (target && target.id !== task.id) move(task, statusOf(target), target.id);
  }

  const total = tasks.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
        <CardDescription>
          {total === 0
            ? "Nothing planned yet."
            : `${tasks.filter((task) => task.status === "done").length} of ${total} done.`}
        </CardDescription>
        <CardAction stackOnPhone className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Tasks view"
              className="bg-muted inline-flex rounded-lg p-0.5"
            >
              {(
                [
                  ["list", "List", LayoutList],
                  ["board", "Board", SquareKanban],
                ] as const
              ).map(([key, label, Icon]) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={view === key ? "secondary" : "ghost"}
                  aria-pressed={view === key}
                  onClick={() => setView(key)}
                >
                  <Icon aria-hidden="true" /> {label}
                </Button>
              ))}
            </div>
            {canUpdate && (
              <Button size="sm" variant="outline" onClick={() => edit()}>
                <Plus aria-hidden="true" /> Add task
              </Button>
            )}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState
            compact
            icon={ListChecks}
            title="No tasks yet"
            description="Add the pieces of work, give them to the team and move them along as they get done."
          />
        ) : view === "list" ? (
          <ul className="divide-y rounded-lg border">
            {tasks.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      task.status === "done" && "text-muted-foreground line-through",
                    )}
                  >
                    {task.title}
                  </p>
                  <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                    {task.milestoneName && <span>{task.milestoneName}</span>}
                    {task.dueDate && (
                      <span
                        className={
                          isOverdue(task.dueDate, today, task.status === "done")
                            ? "text-destructive font-medium"
                            : undefined
                        }
                      >
                        Due {formatDate(task.dueDate)}
                      </span>
                    )}
                    {task.estimateMinutes && (
                      <span>Estimate {formatMinutes(task.estimateMinutes)}</span>
                    )}
                    {task.loggedMinutes > 0 && (
                      <span>{formatMinutes(task.loggedMinutes)} logged</span>
                    )}
                    {task.commentCount > 0 && <CommentCount n={task.commentCount} />}
                  </p>
                </div>
                {task.priority === "high" && <TaskPriorityBadge priority={task.priority} />}
                <Person
                  name={task.assignee?.name}
                  avatarUrl={task.assignee?.avatarUrl}
                  fallback="Unassigned"
                />
                {canUpdate ? (
                  <StatusSelect
                    task={task}
                    value={statusOf(task)}
                    disabled={pending}
                    onChange={(status) => move(task, status)}
                  />
                ) : (
                  <TaskStatusBadge status={task.status} />
                )}
                {canUpdate && (
                  <div className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Edit ${task.title}`}
                      onClick={() => edit(task)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Delete ${task.title}`}
                      disabled={pending}
                      onClick={() => setRemoving(task)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={(event: DragStartEvent) =>
              setDragging(tasks.find((task) => task.id === event.active.id) ?? null)
            }
            onDragEnd={onDragEnd}
            onDragCancel={() => setDragging(null)}
          >
            <div className="flex gap-3 overflow-x-auto pb-2">
              {TASK_STATUSES.map((status) => (
                <Column key={status} status={status} droppable={canUpdate}>
                  {(byStatus.get(status) ?? []).map((task) => (
                    <BoardCard
                      key={task.id}
                      task={task}
                      today={today}
                      draggable={canUpdate}
                      hidden={dragging?.id === task.id}
                      pending={pending}
                      status={statusOf(task)}
                      onStatus={(next) => move(task, next)}
                      onEdit={() => edit(task)}
                    />
                  ))}
                </Column>
              ))}
            </div>
            <DragOverlay>
              {dragging ? <CardBody task={dragging} today={today} overlay /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </CardContent>

      <Dialog open={draft !== null} onOpenChange={(next) => !next && !pending && setDraft(null)}>
        <DialogContent scrollable>
          {draft && (
            <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
              <DialogHeader>
                <DialogTitle>{draft.id ? "Edit task" : "Add a task"}</DialogTitle>
                <DialogDescription>
                  Tasks can be given to people on the project&apos;s team.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="grid gap-4">
                <Field id="task-title" label="What needs doing" required error={errors.title}>
                  <Input
                    id="task-title"
                    value={draft.title}
                    onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                    aria-invalid={!!errors.title}
                    autoComplete="off"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="task-assignee" label="Assigned to" error={errors.assigneeId}>
                    <PersonSelect
                      id="task-assignee"
                      value={draft.assigneeId}
                      onChange={(value) => setDraft({ ...draft, assigneeId: value })}
                      people={team}
                    />
                  </Field>
                  <Field id="task-priority" label="Priority">
                    <Select
                      value={draft.priority}
                      onValueChange={(next) =>
                        setDraft({ ...draft, priority: next as TaskPriority })
                      }
                    >
                      <SelectTrigger id="task-priority" className="w-full">
                        <SelectValue>
                          {(value: TaskPriority) => TASK_PRIORITY_LABEL[value]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_PRIORITIES.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {TASK_PRIORITY_LABEL[priority]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="task-due" label="Due" error={errors.dueDate}>
                    <DatePicker
                      id="task-due"
                      value={draft.dueDate}
                      onChange={(value) => setDraft({ ...draft, dueDate: value })}
                      clearable
                    />
                  </Field>
                  <Field
                    id="task-estimate"
                    label="Estimate (hours)"
                    error={errors.estimate}
                    hint="Like 4 or 1:30."
                  >
                    <Input
                      id="task-estimate"
                      inputMode="decimal"
                      value={draft.estimate}
                      onChange={(event) => setDraft({ ...draft, estimate: event.target.value })}
                      aria-invalid={!!errors.estimate}
                    />
                  </Field>
                </div>
                {milestones.length > 0 && (
                  <Field id="task-milestone" label="Milestone" error={errors.milestoneId}>
                    <Select
                      value={draft.milestoneId || NO_MILESTONE}
                      onValueChange={(next) =>
                        setDraft({
                          ...draft,
                          milestoneId: next === NO_MILESTONE ? "" : String(next),
                        })
                      }
                    >
                      <SelectTrigger id="task-milestone" className="w-full">
                        <SelectValue>
                          {(value: string) =>
                            milestones.find((milestone) => milestone.id === value)?.name ??
                            "No milestone"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_MILESTONE}>No milestone</SelectItem>
                        {milestones.map((milestone) => (
                          <SelectItem key={milestone.id} value={milestone.id}>
                            {milestone.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                <Field id="task-description" label="Details" error={errors.description}>
                  <Textarea
                    id="task-description"
                    rows={3}
                    value={draft.description}
                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  />
                </Field>
                {draft.id && <TaskComments taskId={draft.id} me={me} />}
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
                <Button type="submit" disabled={pending || !draft.title.trim()}>
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
        title={`Delete ${removing?.title ?? "this task"}?`}
        description="A task with hours logged is kept: mark it done instead."
        confirmLabel="Delete"
        destructive
        pending={pending}
        onConfirm={() =>
          removing &&
          run(() => deleteTask(removing.id), {
            success: "Task deleted.",
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

function StatusSelect({
  task,
  value,
  disabled,
  onChange,
  className,
}: {
  task: TaskView;
  value: TaskStatus;
  disabled?: boolean;
  onChange: (status: TaskStatus) => void;
  className?: string;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => onChange(next as TaskStatus)}
    >
      <SelectTrigger
        size="sm"
        aria-label={`Status of ${task.title}`}
        className={className ?? "w-36"}
      >
        <SelectValue>{(current: TaskStatus) => TASK_STATUS_LABEL[current]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {TASK_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {TASK_STATUS_LABEL[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Column({
  status,
  droppable,
  children,
}: {
  status: TaskStatus;
  droppable: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}`, disabled: !droppable });
  const count = Array.isArray(children) ? children.length : 0;
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`tasks-${status}`}
      className={cn(
        "bg-muted/40 flex min-h-40 w-64 shrink-0 flex-col gap-2 rounded-xl border p-2 transition-colors sm:w-72",
        isOver && "bg-primary/5 border-primary ring-primary/30 ring-2",
      )}
    >
      <h3
        id={`tasks-${status}`}
        className="flex items-center justify-between px-1 text-sm font-semibold"
      >
        {TASK_STATUS_LABEL[status]}
        <span className="text-muted-foreground text-xs font-normal tabular-nums">{count}</span>
      </h3>
      {count === 0 ? (
        <p className="text-muted-foreground px-1 py-3 text-xs">Nothing here.</p>
      ) : (
        children
      )}
    </section>
  );
}

function BoardCard({
  task,
  today,
  draggable,
  hidden,
  pending,
  status,
  onStatus,
  onEdit,
}: {
  task: TaskView;
  today: string;
  draggable: boolean;
  hidden: boolean;
  pending: boolean;
  status: TaskStatus;
  onStatus: (status: TaskStatus) => void;
  onEdit: () => void;
}) {
  const drag = useDraggable({ id: task.id, disabled: !draggable });
  // A card is also a drop target, so dropping on it puts the dragged card just before it.
  const drop = useDroppable({ id: task.id, disabled: !draggable });
  return (
    <div
      ref={(node) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      className={cn(hidden && "opacity-40")}
    >
      <CardBody
        task={task}
        today={today}
        handle={
          draggable ? (
            <button
              type="button"
              {...drag.attributes}
              {...drag.listeners}
              aria-label={`Move ${task.title}`}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -ml-1 cursor-grab touch-none rounded p-0.5 focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing"
            >
              <GripVertical className="size-4" aria-hidden="true" />
            </button>
          ) : null
        }
        footer={
          draggable ? (
            <div className="mt-2 flex items-center gap-1">
              <StatusSelect
                task={task}
                value={status}
                disabled={pending}
                onChange={onStatus}
                className="w-full"
              />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Edit ${task.title}`}
                onClick={onEdit}
              >
                <Pencil aria-hidden="true" />
              </Button>
            </div>
          ) : null
        }
      />
    </div>
  );
}

function CardBody({
  task,
  today,
  handle,
  footer,
  overlay = false,
}: {
  task: TaskView;
  today: string;
  handle?: React.ReactNode;
  footer?: React.ReactNode;
  overlay?: boolean;
}) {
  const late = isOverdue(task.dueDate, today, task.status === "done");
  return (
    <article className={cn("bg-card rounded-lg border p-3 shadow-xs", overlay && "shadow-lg")}>
      <div className="flex items-start gap-1.5">
        {handle}
        <p
          className={cn(
            "min-w-0 flex-1 text-sm font-medium",
            task.status === "done" && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          {task.priority === "high" && <TaskPriorityBadge priority="high" />}
          <Person
            name={task.assignee?.name}
            avatarUrl={task.assignee?.avatarUrl}
            fallback="Unassigned"
          />
        </span>
        {task.commentCount > 0 && <CommentCount n={task.commentCount} />}
        {task.dueDate && (
          <span
            className={cn(
              "text-xs",
              late ? "text-destructive font-medium" : "text-muted-foreground",
            )}
          >
            {late ? "Overdue · " : ""}
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
      {footer}
    </article>
  );
}

function CommentCount({ n }: { n: number }) {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
      <MessageSquare className="size-3.5" aria-hidden="true" />
      <span aria-label={`${n} ${n === 1 ? "comment" : "comments"}`}>{n}</span>
    </span>
  );
}
