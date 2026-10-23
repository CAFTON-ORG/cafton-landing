"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, CornerUpLeft, Inbox } from "lucide-react";

import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Field } from "@/components/dashboard/shared/field";
import { Person } from "@/components/dashboard/shared/person";
import { Button } from "@/components/dashboard/ui/button";
import {
  CardAction,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { reviewTime } from "../actions/time";
import { formatMinutes } from "../rules";
import type { TimeEntryView } from "../types";

interface Group {
  key: string;
  person: TimeEntryView["person"];
  weekStart: string;
  entries: TimeEntryView[];
  minutes: number;
}

/** Submitted time, one card per person and week. Approve it as sent, or send it back with a reason. */
export function Approvals({ entries, me }: { entries: TimeEntryView[]; me: string }) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [rejecting, setRejecting] = useState<Group | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const entry of entries) {
      const key = `${entry.person.id}|${entry.weekStart}`;
      const group = map.get(key) ?? {
        key,
        person: entry.person,
        weekStart: entry.weekStart,
        entries: [],
        minutes: 0,
      };
      group.entries.push(entry);
      group.minutes += entry.minutes;
      map.set(key, group);
    }
    return [...map.values()];
  }, [entries]);

  function review(group: Group, action: "approve" | "reject") {
    setError("");
    run(() => reviewTime({ ids: group.entries.map((entry) => entry.id), action, note }), {
      success: action === "approve" ? "Approved." : "Sent back.",
      onSuccess: () => {
        setRejecting(null);
        setNote("");
        router.refresh();
      },
      onFieldErrors: (errors) => setError(errors.note ?? ""),
    });
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            compact
            icon={Inbox}
            title="Nothing to approve"
            description="Timesheets people submit show up here."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {groups.map((group) => {
        const own = group.person.id === me;
        return (
          <Card key={group.key}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-3">
                <Person name={group.person.name} avatarUrl={group.person.avatarUrl} />
                <span className="text-muted-foreground text-sm font-normal">
                  Week of {formatDate(group.weekStart)} · {formatMinutes(group.minutes)}
                </span>
              </CardTitle>
              <CardDescription>
                {own
                  ? "This is your own timesheet. Someone else has to approve it."
                  : `${group.entries.length} ${group.entries.length === 1 ? "entry" : "entries"}`}
              </CardDescription>
              <CardAction stackOnPhone className="flex flex-wrap items-center justify-end gap-2">
                {!own && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        setNote("");
                        setError("");
                        setRejecting(group);
                      }}
                    >
                      <CornerUpLeft aria-hidden="true" /> Send back
                    </Button>
                    <Button size="sm" disabled={pending} onClick={() => review(group, "approve")}>
                      <Check aria-hidden="true" /> Approve
                    </Button>
                  </div>
                )}
              </CardAction>
            </CardHeader>
            <CardContent>
              <ul className="divide-y rounded-lg border">
                {group.entries.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                    <span className="text-muted-foreground w-24 shrink-0 text-xs">
                      {formatDate(entry.workDate)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {entry.projectName}
                        {entry.taskTitle && (
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            · {entry.taskTitle}
                          </span>
                        )}
                      </p>
                      {entry.note && <p className="text-muted-foreground text-xs">{entry.note}</p>}
                    </div>
                    {!entry.billable && (
                      <span className="text-muted-foreground text-xs">Not billable</span>
                    )}
                    <span className="font-medium tabular-nums">{formatMinutes(entry.minutes)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      <Dialog
        open={rejecting !== null}
        onOpenChange={(next) => !next && !pending && setRejecting(null)}
      >
        <DialogContent>
          {rejecting && (
            <form
              noValidate
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                review(rejecting, "reject");
              }}
            >
              <DialogHeader>
                <DialogTitle>Send {rejecting.person.name}&apos;s week back</DialogTitle>
                <DialogDescription>
                  They can fix it and submit again. Tell them what to change.
                </DialogDescription>
              </DialogHeader>
              <Field id="review-note" label="Why" required error={error}>
                <Textarea
                  id="review-note"
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  aria-invalid={!!error}
                />
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setRejecting(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending || !note.trim()}>
                  {pending ? "Sending…" : "Send back"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
