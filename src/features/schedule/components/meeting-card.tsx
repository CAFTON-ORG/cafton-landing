"use client";

import Link from "next/link";
import { Person } from "@/components/dashboard/shared/person";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Clock, MapPin, Phone, UserX, Users, Video, X } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { Field } from "@/components/dashboard/shared/field";
import { StatusBadge, type StatusTone } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/dashboard/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dashboard/ui/dialog";
import { Textarea } from "@/components/dashboard/ui/textarea";
import type { PersonRef } from "@/features/crm/types";
import { useServerAction } from "@/hooks/use-server-action";
import { cn } from "@/lib/utils";
import { setMeetingStatus } from "../actions/schedule";
import { isEditable, isOverdue } from "../rules/core";
import { formatManila, formatManilaTime } from "../rules/slots";
import {
  MEETING_MODE_LABEL,
  MEETING_STATUS_LABEL,
  type MeetingMode,
  type MeetingStatus,
  type MeetingView,
} from "../types";
import { MeetingDialog } from "./meeting-dialog";

export const STATUS_TONE: Record<MeetingStatus, StatusTone> = {
  requested: "warning",
  confirmed: "success",
  completed: "info",
  cancelled: "neutral",
  no_show: "danger",
};

const MODE_ICON: Record<MeetingMode, typeof Video> = {
  video: Video,
  phone: Phone,
  in_person: Users,
};

/** One meeting, with the actions that make sense for its status. */
export function MeetingCard({
  meeting,
  people,
  compact = false,
}: {
  meeting: MeetingView;
  people: PersonRef[];
  /** On a lead or deal: show the date as well as the time. */
  compact?: boolean;
}) {
  const router = useRouter();
  const canUpdate = useCan("meetings:update");
  const { run, pending } = useServerAction();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const start = new Date(meeting.startsAt);
  const end = new Date(meeting.endsAt);
  const now = new Date();
  const overdue = isOverdue(meeting.status, end, now);
  const started = start <= now;
  const Icon = MODE_ICON[meeting.mode];

  const change = (status: MeetingStatus, why?: string, success?: string) =>
    run(() => setMeetingStatus({ id: meeting.id, status, reason: why }), {
      success: (data) =>
        success && data?.emailed
          ? `${success} We emailed ${meeting.attendeeName}.`
          : (success ?? "Updated."),
      onSuccess: () => {
        setCancelling(false);
        setReason("");
        router.refresh();
      },
    });

  return (
    <article
      className={cn(
        "bg-card grid gap-2 rounded-xl border p-3",
        meeting.status === "cancelled" && "opacity-70",
      )}
    >
      <div className="text-sm">
        {compact && (
          <p className="font-medium">
            {formatManila(start, { hour: undefined, minute: undefined })}
          </p>
        )}
        <p
          className={cn(
            "flex items-center gap-1.5 tabular-nums",
            compact ? "text-muted-foreground" : "font-medium",
          )}
        >
          <Clock className="size-3.5" aria-hidden="true" />
          {formatManilaTime(start)} – {formatManilaTime(end)}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">Philippine time</p>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-medium">{meeting.title}</h3>
            <p className="text-muted-foreground mt-0.5 flex items-center gap-2 text-sm">
              <Person
                name={meeting.attendeeName}
                email={meeting.attendeeEmail}
                secondary={meeting.attendeeEmail}
              />
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {meeting.source === "website" && (
              <StatusBadge tone="info">From the website</StatusBadge>
            )}
            {overdue && <StatusBadge tone="danger">Needs closing</StatusBadge>}
            <StatusBadge tone={STATUS_TONE[meeting.status]}>
              {MEETING_STATUS_LABEL[meeting.status]}
            </StatusBadge>
          </div>
        </div>

        <p className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="flex items-center gap-1.5">
            <Icon className="size-3.5" aria-hidden="true" /> {MEETING_MODE_LABEL[meeting.mode]}
          </span>
          {meeting.location && (
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              {/^https:\/\//.test(meeting.location) ? (
                <a
                  href={meeting.location}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate underline underline-offset-4"
                >
                  {meeting.location}
                </a>
              ) : (
                <span className="truncate">{meeting.location}</span>
              )}
            </span>
          )}
          {meeting.ownerName && (
            <span className="flex items-center gap-1.5">
              Host: <Person name={meeting.ownerName} avatarUrl={meeting.ownerAvatar} />
            </span>
          )}
        </p>

        {(meeting.lead || meeting.deal || meeting.contact) && (
          <p className="mt-1 flex flex-wrap gap-x-3 text-sm">
            {meeting.lead && (
              <Link
                className="underline underline-offset-4"
                href={`/dashboard/crm/leads/${meeting.lead.id}`}
              >
                Lead {meeting.lead.label}
              </Link>
            )}
            {meeting.deal && (
              <Link
                className="underline underline-offset-4"
                href={`/dashboard/crm/deals/${meeting.deal.id}`}
              >
                Deal {meeting.deal.label}
              </Link>
            )}
            {meeting.contact && (
              <Link
                className="underline underline-offset-4"
                href={`/dashboard/crm/contacts/${meeting.contact.id}`}
              >
                {meeting.contact.label}
              </Link>
            )}
          </p>
        )}
        {meeting.notes && (
          <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">{meeting.notes}</p>
        )}
        {meeting.cancelledReason && (
          <p className="text-muted-foreground mt-2 text-sm">Reason: {meeting.cancelledReason}</p>
        )}

        {canUpdate && (
          <div className="mt-3 flex flex-wrap gap-2">
            {meeting.status === "requested" && (
              <Button
                size="sm"
                disabled={pending}
                onClick={() => change("confirmed", undefined, "Confirmed.")}
              >
                <Check aria-hidden="true" /> Confirm
              </Button>
            )}
            {isEditable(meeting.status) && (
              <MeetingDialog
                meeting={meeting}
                people={people}
                trigger={<Button size="sm" variant="outline" disabled={pending} />}
              >
                Reschedule
              </MeetingDialog>
            )}
            {meeting.status === "confirmed" && started && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => change("completed", undefined, "Marked as held.")}
                >
                  <Check aria-hidden="true" /> Mark as held
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => change("no_show", undefined, "Marked as a no-show.")}
                >
                  <UserX aria-hidden="true" /> No-show
                </Button>
              </>
            )}
            {isEditable(meeting.status) && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => setCancelling(true)}
              >
                <X aria-hidden="true" /> {meeting.status === "requested" ? "Decline" : "Cancel"}
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={cancelling} onOpenChange={(open) => !pending && setCancelling(open)}>
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              change("cancelled", reason, "Cancelled.");
            }}
            className="grid gap-4"
          >
            <DialogHeader>
              <DialogTitle>
                {meeting.status === "requested" ? "Decline this request?" : "Cancel this meeting?"}
              </DialogTitle>
              <DialogDescription>
                {meeting.attendeeName} is told by email, and the time becomes free again.
              </DialogDescription>
            </DialogHeader>
            <Field id={`cancel-${meeting.id}`} label="Reason" required hint="They will read this.">
              <Textarea
                id={`cancel-${meeting.id}`}
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCancelling(false)}
                disabled={pending}
              >
                Keep it
              </Button>
              <Button type="submit" variant="destructive" disabled={pending || !reason.trim()}>
                {pending
                  ? "Saving…"
                  : meeting.status === "requested"
                    ? "Decline"
                    : "Cancel meeting"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </article>
  );
}
