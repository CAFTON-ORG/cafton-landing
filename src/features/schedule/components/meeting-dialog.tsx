"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Field } from "@/components/dashboard/shared/field";
import { TimeSelect } from "@/components/dashboard/shared/time-select";
import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { Button } from "@/components/dashboard/ui/button";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/dashboard/ui/dialog";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { PersonSelect } from "@/features/crm/components/owner-select";
import type { PersonRef } from "@/features/crm/types/core";
import { useServerAction } from "@/hooks/use-server-action";
import { createMeeting, suggestTimes, updateMeeting } from "../actions/schedule";
import { manilaDate, manilaTime } from "../rules/slots";
import {
  MEETING_MODES,
  MEETING_MODE_LABEL,
  type MeetingMode,
  type MeetingView,
} from "../types/core";

const DURATIONS = [15, 30, 45, 60, 90, 120];

/** What a new meeting starts with when it is made from a lead, contact or deal. */
export interface MeetingDefaults {
  title?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  attendeePhone?: string;
  leadId?: string;
  contactId?: string;
  dealId?: string;
  date?: string;
}

/** Schedule (no `meeting`) or change a meeting. Dates and times are Philippine time. */
export function MeetingDialog({
  meeting,
  defaults,
  people,
  trigger,
  children,
}: {
  meeting?: MeetingView;
  defaults?: MeetingDefaults;
  people: PersonRef[];
  /** The button that opens it. */
  trigger: ReactNode;
  /** What the button says. */
  children?: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { run, pending } = useServerAction();
  const start = meeting ? new Date(meeting.startsAt) : null;
  const initial = {
    title: meeting?.title ?? defaults?.title ?? "",
    attendeeName: meeting?.attendeeName ?? defaults?.attendeeName ?? "",
    attendeeEmail: meeting?.attendeeEmail ?? defaults?.attendeeEmail ?? "",
    attendeePhone: meeting?.attendeePhone ?? defaults?.attendeePhone ?? "",
    date: start ? manilaDate(start) : (defaults?.date ?? ""),
    time: start ? manilaTime(start) : "",
    durationMinutes: meeting
      ? Math.round((new Date(meeting.endsAt).getTime() - start!.getTime()) / 60000)
      : 30,
    mode: (meeting?.mode ?? "video") as MeetingMode,
    location: meeting?.location ?? "",
    notes: meeting?.notes ?? "",
    ownerId: meeting?.ownerId ?? "",
    notify: true,
  };
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [free, setFree] = useState<string[]>([]);
  const set = <K extends keyof typeof initial>(key: K, value: (typeof initial)[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  // Free times for the chosen day, as suggestions (staff can still type any time).
  useEffect(() => {
    if (!open || !values.date) return;
    let ignore = false;
    void suggestTimes(values.date, meeting?.id).then((result) => {
      if (!ignore) setFree(result.ok ? (result.data?.times ?? []) : []);
    });
    return () => {
      ignore = true;
    };
  }, [open, values.date, meeting?.id]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    const input = {
      ...values,
      id: meeting?.id,
      leadId: meeting ? undefined : defaults?.leadId,
      contactId: meeting ? undefined : defaults?.contactId,
      dealId: meeting ? undefined : defaults?.dealId,
    };
    run(() => (meeting ? updateMeeting(input) : createMeeting(input)), {
      success: (data) =>
        data && "emailed" in data && values.notify
          ? data.emailed
            ? meeting
              ? "Saved. We emailed the new time."
              : "Scheduled. We emailed the confirmation."
            : "Saved, but the email could not be sent."
          : meeting
            ? "Saved."
            : "Scheduled.",
      onSuccess: () => {
        setOpen(false);
        router.refresh();
      },
      onFieldErrors: setErrors,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setValues(initial);
          setErrors({});
        }
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement}>{children}</DialogTrigger>
      <DialogContent scrollable className="sm:max-w-xl">
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{meeting ? "Reschedule or edit" : "Schedule a meeting"}</DialogTitle>
            <DialogDescription>
              Times are Philippine time. Two meetings can&apos;t overlap.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <Field id="meeting-title" label="Title" required error={errors.title}>
              <Input
                id="meeting-title"
                value={values.title}
                onChange={(event) => set("title", event.target.value)}
                aria-invalid={!!errors.title}
                autoComplete="off"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="meeting-name" label="Who is it with" required error={errors.attendeeName}>
                <Input
                  id="meeting-name"
                  value={values.attendeeName}
                  onChange={(event) => set("attendeeName", event.target.value)}
                  aria-invalid={!!errors.attendeeName}
                  autoComplete="off"
                />
              </Field>
              <Field id="meeting-email" label="Their email" required error={errors.attendeeEmail}>
                <Input
                  id="meeting-email"
                  type="email"
                  value={values.attendeeEmail}
                  onChange={(event) => set("attendeeEmail", event.target.value)}
                  aria-invalid={!!errors.attendeeEmail}
                  autoComplete="off"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem_8rem]">
              <Field id="meeting-date" label="Date" required error={errors.date}>
                <DatePicker
                  id="meeting-date"
                  value={values.date}
                  onChange={(value) => set("date", value)}
                  aria-invalid={!!errors.date}
                />
              </Field>
              <Field
                id="meeting-time"
                label="Start time"
                hint={free.length ? "Times marked Free are open in your office hours." : undefined}
                required
                error={errors.time}
              >
                <TimeSelect
                  id="meeting-time"
                  value={values.time}
                  onChange={(value) => set("time", value)}
                  suggested={free}
                  aria-invalid={!!errors.time}
                />
              </Field>
              <Field id="meeting-duration" label="Length" error={errors.durationMinutes}>
                <Select
                  value={String(values.durationMinutes)}
                  onValueChange={(value) => set("durationMinutes", Number(value))}
                >
                  <SelectTrigger id="meeting-duration" className="w-full">
                    <SelectValue>{(value: string) => `${value} min`}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((minutes) => (
                      <SelectItem key={minutes} value={String(minutes)}>
                        {minutes} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="meeting-mode" label="Type">
                <Select
                  value={values.mode}
                  onValueChange={(value) => set("mode", value as MeetingMode)}
                >
                  <SelectTrigger id="meeting-mode" className="w-full">
                    <SelectValue>
                      {(value: string) => MEETING_MODE_LABEL[value as MeetingMode]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {MEETING_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {MEETING_MODE_LABEL[mode]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="meeting-owner" label="Who hosts">
                <PersonSelect
                  id="meeting-owner"
                  value={values.ownerId}
                  onChange={(value) => set("ownerId", value)}
                  people={people}
                  noneLabel="Me"
                />
              </Field>
            </div>
            <Field
              id="meeting-location"
              label="Link, phone or address"
              error={errors.location}
              hint="Sent to them with the confirmation."
            >
              <Input
                id="meeting-location"
                value={values.location}
                onChange={(event) => set("location", event.target.value)}
                autoComplete="off"
              />
            </Field>
            <Field id="meeting-notes" label="Notes" error={errors.notes}>
              <Textarea
                id="meeting-notes"
                rows={3}
                value={values.notes}
                onChange={(event) => set("notes", event.target.value)}
              />
            </Field>
            <div className="flex items-start gap-2 py-0.5">
              <Checkbox
                id="meeting-notify"
                checked={values.notify}
                onCheckedChange={(checked) => set("notify", checked === true)}
              />
              <Label htmlFor="meeting-notify" className="text-sm leading-snug font-normal">
                Email them the details with a calendar file
              </Label>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : meeting ? "Save" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
