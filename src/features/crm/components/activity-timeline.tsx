"use client";

import { useState } from "react";
import {
  ArrowRightLeft,
  CalendarDays,
  Cog,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useCan } from "@/components/dashboard/layout/staff-context";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate, formatRelative } from "@/lib/format";
import type { Permission } from "@/lib/auth/permissions";
import { addActivity } from "../actions/activity";
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

/** The record's history, newest first, with a box to add to it. */
export function ActivityTimeline({
  subject,
  activities,
  writePermission,
}: {
  subject: Subject;
  activities: ActivityView[];
  writePermission: Permission;
}) {
  const canWrite = useCan(writePermission);
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
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <MessageSquare className="size-4" aria-hidden="true" /> Nothing here yet.
          </p>
        ) : (
          <ol className="grid gap-4">
            {activities.map((activity) => {
              const Icon = ICON[activity.type];
              return (
                <li key={activity.id} className="flex gap-3">
                  <span className="bg-muted text-muted-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full">
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm whitespace-pre-wrap">{activity.body}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {activity.by} ·{" "}
                      <time
                        dateTime={activity.at}
                        title={formatDate(activity.at, { dateStyle: "medium", timeStyle: "short" })}
                      >
                        {formatRelative(activity.at)}
                      </time>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
