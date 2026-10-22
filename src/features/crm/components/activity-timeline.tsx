"use client";

import { useState } from "react";
import {
  ArrowRightLeft,
  CalendarDays,
  Cog,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  Pin,
  PinOff,
  StickyNote,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { ConfirmDialog } from "@/components/dashboard/shared/confirm-dialog";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Person } from "@/components/dashboard/shared/person";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/dashboard/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import type { Permission } from "@/lib/auth/permissions";
import { formatDate, formatRelative } from "@/lib/format";
import { addActivity } from "../actions/activity";
import { deleteNote, editNote, pinNote } from "../actions/notes";
import {
  ACTIVITY_TYPES,
  type ActivityView,
  type LoggableActivityType,
  type Subject,
} from "../types";

const ICON: Record<ActivityView["type"], LucideIcon> = {
  note: StickyNote,
  call: Phone,
  email: Mail,
  meeting: CalendarDays,
  stage_change: ArrowRightLeft,
  system: Cog,
};

const LABEL: Record<LoggableActivityType, string> = {
  note: "Note",
  call: "Call",
  email: "Email",
  meeting: "Meeting",
};

const WRITTEN = ["note", "call", "email", "meeting"];

/** The record's history, newest first (pinned entries on top), with a box to add to it. */
export function ActivityTimeline({
  subject,
  activities,
  writePermission,
  currentUserId,
}: {
  subject: Subject;
  activities: ActivityView[];
  writePermission: Permission;
  /** Whose entries can be edited. */
  currentUserId?: string;
}) {
  const canWrite = useCan(writePermission);
  const canAdminister = useCan("users:update");
  const [type, setType] = useState<LoggableActivityType>("note");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const { run, pending } = useServerAction();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    run(() => addActivity({ type, body, subject }), {
      success: "Added to the timeline.",
      onSuccess: () => setBody(""),
      onFieldErrors: (errors) => setError(errors.body ?? Object.values(errors)[0] ?? ""),
    });
  }

  const pinned = activities.filter((activity) => activity.pinned);
  const rest = activities.filter((activity) => !activity.pinned);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        {canWrite && (
          <form onSubmit={submit} className="grid gap-2" noValidate>
            <div className="flex gap-2">
              <Select
                value={type}
                onValueChange={(value) => setType(value as LoggableActivityType)}
              >
                <SelectTrigger size="sm" aria-label="Type of entry" className="w-32">
                  <SelectValue>
                    {(value: string) => LABEL[value as LoggableActivityType]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((entry) => (
                    <SelectItem key={entry} value={entry}>
                      {LABEL[entry]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              aria-label="What happened"
              aria-invalid={!!error}
              placeholder="What happened? Who said what, and what comes next?"
            />
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <div>
              <Button type="submit" size="sm" disabled={pending || !body.trim()}>
                {pending ? "Adding…" : "Add to timeline"}
              </Button>
            </div>
          </form>
        )}

        {activities.length === 0 ? (
          <EmptyState
            compact
            icon={MessageSquare}
            title="No activity yet"
            description="Notes, calls and emails you log here make up the history."
          />
        ) : (
          <>
            {pinned.length > 0 && (
              <section
                aria-label="Pinned"
                className="grid gap-3 rounded-lg border bg-amber-500/5 p-3"
              >
                <h3 className="flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                  <Pin className="size-3" aria-hidden="true" /> Pinned
                </h3>
                <ol className="grid gap-4">
                  {pinned.map((activity) => (
                    <Entry
                      key={activity.id}
                      activity={activity}
                      canWrite={canWrite}
                      canAdminister={canAdminister}
                      currentUserId={currentUserId}
                    />
                  ))}
                </ol>
              </section>
            )}
            <ol className="grid gap-4">
              {rest.map((activity) => (
                <Entry
                  key={activity.id}
                  activity={activity}
                  canWrite={canWrite}
                  canAdminister={canAdminister}
                  currentUserId={currentUserId}
                />
              ))}
            </ol>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Entry({
  activity,
  canWrite,
  canAdminister,
  currentUserId,
}: {
  activity: ActivityView;
  canWrite: boolean;
  canAdminister: boolean;
  currentUserId?: string;
}) {
  const Icon = ICON[activity.type];
  const written = WRITTEN.includes(activity.type);
  const own = !!currentUserId && activity.byId === currentUserId;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(activity.body);
  const [deleting, setDeleting] = useState(false);
  const { run, pending } = useServerAction();

  return (
    <li className="flex gap-3">
      <span className="bg-muted text-muted-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        {editing ? (
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => editNote({ id: activity.id, body: text }), {
                success: "Saved.",
                onSuccess: () => setEditing(false),
              });
            }}
          >
            <Textarea
              value={text}
              rows={3}
              aria-label="Edit the entry"
              onChange={(event) => setText(event.target.value)}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending || !text.trim()}>
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setText(activity.body);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{activity.body}</p>
        )}
        <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1 text-xs">
          {written ? (
            <Person name={activity.by} avatarUrl={activity.byAvatar} className="inline-flex" />
          ) : (
            activity.by
          )}
          <span aria-hidden="true">·</span>
          <time
            dateTime={activity.at}
            title={formatDate(activity.at, { dateStyle: "medium", timeStyle: "short" })}
          >
            {formatRelative(activity.at)}
          </time>
          {activity.edited && <span>(edited)</span>}
        </p>
      </div>
      {written && canWrite && !editing && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Entry options"
                  disabled={pending}
                />
              }
            >
              <MoreHorizontal aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  run(() => pinNote(activity.id, !activity.pinned), {
                    success: activity.pinned ? "Unpinned." : "Pinned to the top.",
                  })
                }
              >
                {activity.pinned ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
                {activity.pinned ? "Unpin" : "Pin to the top"}
              </DropdownMenuItem>
              {own && (
                <DropdownMenuItem onClick={() => setEditing(true)}>
                  <Pencil aria-hidden="true" /> Edit
                </DropdownMenuItem>
              )}
              {(own || canAdminister) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
                    <Trash2 aria-hidden="true" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <ConfirmDialog
            open={deleting}
            onOpenChange={setDeleting}
            title="Delete this entry?"
            description="It is removed from the timeline for everyone. The audit log keeps a record that it was deleted."
            confirmLabel="Delete"
            destructive
            pending={pending}
            onConfirm={() =>
              run(() => deleteNote(activity.id), {
                success: "Deleted.",
                onSuccess: () => setDeleting(false),
              })
            }
          />
        </>
      )}
    </li>
  );
}
