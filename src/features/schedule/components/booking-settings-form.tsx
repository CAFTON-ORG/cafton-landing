"use client";

import { TabCount } from "@/components/dashboard/shared/tab-count";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarOff, Copy, Plus, X } from "lucide-react";

import { EditorLayout } from "@/components/dashboard/shared/editor-layout";
import { Field } from "@/components/dashboard/shared/field";
import { FormActions } from "@/components/dashboard/shared/form-action-bar";
import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { TimeSelect } from "@/components/dashboard/shared/time-select";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { Input } from "@/components/dashboard/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Switch } from "@/components/dashboard/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dashboard/ui/tabs";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { saveSiteDocument } from "@/features/cms/admin/document-actions";
import type { BookingSettings } from "@/features/cms/types";
import { useServerAction } from "@/hooks/use-server-action";
import { addDays, manilaDate, slotsByDate } from "../slots";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Monday first: how a working week reads, even though the data starts on Sunday. */
const ORDER = [1, 2, 3, 4, 5, 6, 0];

const SLOT_LENGTHS = [15, 20, 30, 45, 60, 90, 120];
const BUFFERS = [0, 5, 10, 15, 30, 45, 60];
const NOTICE = [0, 1, 2, 4, 8, 12, 24, 48, 72];
const AHEAD = [7, 14, 30, 45, 60, 90, 180];

const minutesLabel = (n: number) =>
  n === 0 ? "No gap" : n >= 60 ? `${n / 60} hour${n === 60 ? "" : "s"}` : `${n} minutes`;
const hoursLabel = (n: number) =>
  n === 0
    ? "No minimum"
    : n < 24
      ? `${n} hour${n === 1 ? "" : "s"}`
      : `${n / 24} day${n === 24 ? "" : "s"}`;
const daysLabel = (n: number) => (n % 7 === 0 ? `${n / 7} week${n === 7 ? "" : "s"}` : `${n} days`);

function Choice<T extends number>({
  id,
  value,
  options,
  label,
  onChange,
}: {
  id: string;
  value: T;
  options: readonly T[];
  label: (n: T) => string;
  onChange: (value: T) => void;
}) {
  const list = options.includes(value) ? options : [...options, value].sort((a, b) => a - b);
  return (
    <Select value={String(value)} onValueChange={(next) => onChange(Number(next) as T)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue>{(current: string) => label(Number(current) as T)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {list.map((option) => (
          <SelectItem key={option} value={String(option)}>
            {label(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

/** "Mon to Fri, 9:00 AM to 5:00 PM" from the weekly hours: what a visitor would be told. */
function summarise(hours: BookingSettings["hours"]) {
  const open = ORDER.filter((day) => hours[day]?.open);
  if (open.length === 0) return "Closed every day";
  const groups = new Map<string, number[]>();
  for (const day of open) {
    const key = `${hours[day].start}-${hours[day].end}`;
    groups.set(key, [...(groups.get(key) ?? []), day]);
  }
  return [...groups.entries()]
    .map(([key, days]) => {
      const [start, end] = key.split("-");
      const names = days.map((day) => DAYS[day].slice(0, 3));
      return `${names.length > 2 ? `${names[0]} to ${names.at(-1)}` : names.join(" and ")}, ${clock(start)} to ${clock(end)}`;
    })
    .join("; ");
}

/**
 * Booking settings, laid out like the scheduling tools people know (Calendly, Cal.com): weekly
 * hours with a switch per day and "copy to all", days off from a calendar, the rules as plain
 * choices, and a live preview of what a visitor would actually be offered. Save and Discard sit in
 * the rail like every other editing page.
 */
export function BookingSettingsForm({ initial }: { initial: BookingSettings }) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [values, setValues] = useState<BookingSettings>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [offDate, setOffDate] = useState("");
  const [offReason, setOffReason] = useState("");
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof BookingSettings>(key: K, value: BookingSettings[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  const setDay = (day: number, patch: Partial<BookingSettings["hours"][number]>) =>
    set(
      "hours",
      values.hours.map((entry, index) => (index === day ? { ...entry, ...patch } : entry)),
    );

  function copyToWeekdays(from: number) {
    const source = values.hours[from];
    set(
      "hours",
      values.hours.map((entry, index) =>
        index === from || index === 0 || index === 6 ? entry : { ...source },
      ),
    );
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    run(() => saveSiteDocument("booking", values), {
      success: "Saved. The contact form uses it right away.",
      onSuccess: () => router.refresh(),
      onFieldErrors: setErrors,
    });
  }

  // What a visitor would see: the next day with free times, from these very settings.
  const preview = useMemo(() => {
    const now = new Date();
    const today = manilaDate(now);
    const byDate = slotsByDate(
      today,
      addDays(today, Math.min(values.maxDaysAhead, 30)),
      values,
      [],
      now,
    );
    const first = Object.keys(byDate).sort()[0];
    return first ? { date: first, slots: byDate[first] } : null;
  }, [values]);

  const dayErrors = Object.entries(errors).filter(([key]) => key.startsWith("hours"));
  const sortedOff = [...values.blockedDates].sort((a, b) => a.date.localeCompare(b.date));
  const hasError = Object.keys(errors).length > 0;

  return (
    <form onSubmit={save} noValidate>
      <EditorLayout
        rail={
          <>
            <FormActions
              title="Booking"
              dirty={dirty}
              pending={pending}
              onDiscard={() => {
                setValues(initial);
                setErrors({});
              }}
              error={
                hasError ? "Some settings need a look. They are marked on the tabs." : undefined
              }
              links={
                <Button
                  type="button"
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/dashboard/crm/schedule" />}
                >
                  Back to the schedule
                </Button>
              }
            />
            <Card>
              <CardHeader>
                <CardTitle>What visitors see</CardTitle>
                <CardDescription>Updates as you change the settings.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                {!values.enabled ? (
                  <p className="text-muted-foreground">
                    Booking is off. The contact form has no &ldquo;Schedule&rdquo; step.
                  </p>
                ) : (
                  <>
                    <p>
                      <span className="font-medium">{summarise(values.hours)}</span>
                      <br />
                      <span className="text-muted-foreground">
                        {values.slotMinutes}-minute calls,{" "}
                        {minutesLabel(values.bufferMinutes).toLowerCase()} between them, at least{" "}
                        {hoursLabel(values.minNoticeHours).toLowerCase()} ahead, up to{" "}
                        {daysLabel(values.maxDaysAhead)} out.
                      </span>
                    </p>
                    {preview ? (
                      <div>
                        <p className="text-muted-foreground mb-1.5 text-xs">
                          Next free day:{" "}
                          {new Intl.DateTimeFormat("en-PH", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                            timeZone: "UTC",
                          }).format(new Date(`${preview.date}T00:00:00Z`))}
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {preview.slots.slice(0, 8).map((slot) => (
                            <li
                              key={slot.toISOString()}
                              className="bg-muted rounded-md px-2 py-1 text-xs tabular-nums"
                            >
                              {new Intl.DateTimeFormat("en-PH", {
                                hour: "numeric",
                                minute: "2-digit",
                                timeZone: "Asia/Manila",
                              }).format(slot)}
                            </li>
                          ))}
                          {preview.slots.length > 8 && (
                            <li className="text-muted-foreground px-1 py-1 text-xs">
                              +{preview.slots.length - 8} more
                            </li>
                          )}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-amber-800 dark:text-amber-300">
                        No free times in the next 30 days. Open at least one day.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </>
        }
      >
        <Card>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium">Let visitors book a call on the contact form</p>
              <p className="text-muted-foreground text-sm">
                {values.autoConfirm
                  ? "Bookings are confirmed automatically."
                  : "Bookings wait for you to confirm them."}
              </p>
            </div>
            <Switch
              aria-label="Let visitors book a call"
              checked={values.enabled}
              onCheckedChange={(checked) => set("enabled", checked)}
            />
          </CardContent>
        </Card>

        <Tabs defaultValue="hours">
          <TabsList>
            <TabsTrigger value="hours">
              Weekly hours{dayErrors.length > 0 && <span className="text-destructive ml-1">!</span>}
            </TabsTrigger>
            <TabsTrigger value="off">
              Days off
              <TabCount n={values.blockedDates.length} />
            </TabsTrigger>
            <TabsTrigger value="rules">Booking rules</TabsTrigger>
            <TabsTrigger value="where">Where you meet</TabsTrigger>
          </TabsList>

          <TabsContent value="hours" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>When you take calls</CardTitle>
                <CardDescription>
                  Visitors are offered times inside these hours (Philippine time).
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-1">
                {ORDER.map((day) => {
                  const entry = values.hours[day];
                  const error = errors[`hours.${day}`] ?? errors[`hours.${day}.end`];
                  return (
                    <div key={day} className="grid gap-1 border-b py-2.5 last:border-b-0">
                      <div className="grid grid-cols-[7.5rem_1fr] items-center gap-3 sm:grid-cols-[9rem_1fr_1.75rem]">
                        <label className="flex items-center gap-3 text-sm font-medium">
                          <Switch
                            size="sm"
                            checked={entry.open}
                            onCheckedChange={(checked) => setDay(day, { open: checked })}
                            aria-label={`${DAYS[day]} is open`}
                          />
                          {DAYS[day]}
                        </label>
                        {entry.open ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <TimeSelect
                              className="w-32"
                              value={entry.start}
                              aria-label={`${DAYS[day]} opens at`}
                              onChange={(value) => setDay(day, { start: value })}
                              step={30}
                              from={5 * 60}
                              to={22 * 60}
                              aria-invalid={!!error}
                            />
                            <span className="text-muted-foreground text-sm">to</span>
                            <TimeSelect
                              className="w-32"
                              value={entry.end}
                              aria-label={`${DAYS[day]} closes at`}
                              onChange={(value) => setDay(day, { end: value })}
                              step={30}
                              from={5 * 60}
                              to={23 * 60}
                              aria-invalid={!!error}
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unavailable</span>
                        )}
                        {entry.open && day !== 0 && day !== 6 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Copy these hours to all weekdays"
                            aria-label={`Copy ${DAYS[day]}'s hours to all weekdays`}
                            onClick={() => copyToWeekdays(day)}
                          >
                            <Copy aria-hidden="true" />
                          </Button>
                        ) : (
                          <span className="size-7" aria-hidden="true" />
                        )}
                      </div>
                      {error && (
                        <p role="alert" className="text-destructive text-xs">
                          {error}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="off" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Days off</CardTitle>
                <CardDescription>
                  Holidays and days away. Nothing can be booked on these dates.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
                  <Field id="off-date" label="Date">
                    <DatePicker
                      id="off-date"
                      value={offDate}
                      onChange={setOffDate}
                      isDisabled={(day) =>
                        values.blockedDates.some(
                          (b) =>
                            b.date ===
                            `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
                        )
                      }
                    />
                  </Field>
                  <Field id="off-reason" label="Reason (optional)">
                    <Input
                      id="off-reason"
                      value={offReason}
                      maxLength={80}
                      placeholder="e.g. Christmas Day"
                      onChange={(event) => setOffReason(event.target.value)}
                    />
                  </Field>
                  <Button
                    type="button"
                    disabled={!offDate}
                    onClick={() => {
                      set("blockedDates", [
                        ...values.blockedDates,
                        { date: offDate, reason: offReason.trim() },
                      ]);
                      setOffDate("");
                      setOffReason("");
                    }}
                  >
                    <Plus aria-hidden="true" /> Add
                  </Button>
                </div>
                {sortedOff.length === 0 ? (
                  <EmptyState
                    compact
                    icon={CalendarOff}
                    title="No days off"
                    description="Add a holiday or a day you are away and it stops being offered."
                  />
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {sortedOff.map((off) => (
                      <li
                        key={off.date}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                      >
                        <span>
                          <span className="font-medium">
                            {new Intl.DateTimeFormat("en-PH", {
                              dateStyle: "full",
                              timeZone: "UTC",
                            }).format(new Date(`${off.date}T00:00:00Z`))}
                          </span>
                          {off.reason && (
                            <span className="text-muted-foreground"> · {off.reason}</span>
                          )}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${off.date}`}
                          onClick={() =>
                            set(
                              "blockedDates",
                              values.blockedDates.filter((b) => b.date !== off.date),
                            )
                          }
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Booking rules</CardTitle>
                <CardDescription>How calls are offered inside your hours.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field id="rule-length" label="Length of a call" error={errors.slotMinutes}>
                  <Choice
                    id="rule-length"
                    value={values.slotMinutes}
                    options={SLOT_LENGTHS}
                    label={(n) => `${n} minutes`}
                    onChange={(n) => set("slotMinutes", n)}
                  />
                </Field>
                <Field
                  id="rule-buffer"
                  label="Gap between calls"
                  error={errors.bufferMinutes}
                  hint="Time to breathe before the next one."
                >
                  <Choice
                    id="rule-buffer"
                    value={values.bufferMinutes}
                    options={BUFFERS}
                    label={minutesLabel}
                    onChange={(n) => set("bufferMinutes", n)}
                  />
                </Field>
                <Field
                  id="rule-notice"
                  label="Minimum notice"
                  error={errors.minNoticeHours}
                  hint="How soon before a call someone can still book it."
                >
                  <Choice
                    id="rule-notice"
                    value={values.minNoticeHours}
                    options={NOTICE}
                    label={hoursLabel}
                    onChange={(n) => set("minNoticeHours", n)}
                  />
                </Field>
                <Field
                  id="rule-ahead"
                  label="How far ahead"
                  error={errors.maxDaysAhead}
                  hint="The furthest day visitors can pick."
                >
                  <Choice
                    id="rule-ahead"
                    value={values.maxDaysAhead}
                    options={AHEAD}
                    label={daysLabel}
                    onChange={(n) => set("maxDaysAhead", n)}
                  />
                </Field>
                <div className="flex items-start justify-between gap-4 rounded-lg border p-3 sm:col-span-2">
                  <div>
                    <p className="text-sm font-medium">Confirm bookings automatically</p>
                    <p className="text-muted-foreground text-xs">
                      Off: you review each request first (recommended). On: the visitor is confirmed
                      at once and gets the calendar file.
                    </p>
                  </div>
                  <Switch
                    aria-label="Confirm bookings automatically"
                    checked={values.autoConfirm}
                    onCheckedChange={(checked) => set("autoConfirm", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="where" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Where you meet</CardTitle>
                <CardDescription>Sent to the visitor with their confirmation.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Field
                  id="where-video"
                  label="Video call link"
                  error={errors.videoLink}
                  hint="A Google Meet, Zoom or Teams room. Must start with https://"
                >
                  <Input
                    id="where-video"
                    value={values.videoLink}
                    placeholder="https://meet.google.com/…"
                    aria-invalid={!!errors.videoLink}
                    onChange={(event) => set("videoLink", event.target.value)}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="where-phone"
                    label="Phone number we call from"
                    error={errors.phoneNumber}
                  >
                    <Input
                      id="where-phone"
                      value={values.phoneNumber}
                      onChange={(event) => set("phoneNumber", event.target.value)}
                    />
                  </Field>
                  <Field id="where-office" label="Office address" error={errors.office}>
                    <Input
                      id="where-office"
                      value={values.office}
                      onChange={(event) => set("office", event.target.value)}
                    />
                  </Field>
                </div>
                <Field
                  id="where-intro"
                  label="Message above the calendar"
                  error={errors.intro}
                  hint="Shown to visitors when they pick a time."
                >
                  <Textarea
                    id="where-intro"
                    rows={3}
                    value={values.intro}
                    maxLength={300}
                    onChange={(event) => set("intro", event.target.value)}
                  />
                </Field>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </EditorLayout>
    </form>
  );
}
