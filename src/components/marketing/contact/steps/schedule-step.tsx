"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, Phone, Users, Video, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export type MeetingChoice = { start: string; mode: "video" | "phone" | "in_person" };

interface Month {
  enabled: boolean;
  intro?: string;
  today?: string;
  days: Record<string, string[]>;
}

const MODES: { value: MeetingChoice["mode"]; label: string; icon: typeof Video }[] = [
  { value: "video", label: "Video call", icon: Video },
  { value: "phone", label: "Phone call", icon: Phone },
  { value: "in_person", label: "In person", icon: Users },
];

const MANILA = "Asia/Manila";
const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", { timeZone: MANILA, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
/** The Manila calendar date of a slot, "YYYY-MM-DD". */
const manilaDate = (iso: string) =>
  new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(0, 10);
const localKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const monthKey = (date: Date) => localKey(date).slice(0, 7);

/**
 * An optional step: pick a day on the calendar, then a time. Only days with a free time can be
 * chosen, and the times come from the server, so what is offered is really free. Everything is
 * Philippine time, said plainly. Leaving it empty simply sends the enquiry.
 */
export function ScheduleStep({
  value,
  onChange,
  intro,
}: {
  value: MeetingChoice | null;
  onChange: (value: MeetingChoice | null) => void;
  intro: string;
}) {
  const [month, setMonth] = useState(() => (value ? new Date(`${manilaDate(value.start)}T12:00:00`) : new Date()));
  const [months, setMonths] = useState<Record<string, Month>>({});
  const [failed, setFailed] = useState(false);
  const key = monthKey(month);
  const data = months[key];
  const selectedDate = value ? manilaDate(value.start) : undefined;
  const [pickedDate, setPickedDate] = useState<string | undefined>(selectedDate);

  useEffect(() => {
    if (months[key]) return;
    const controller = new AbortController();
    fetch(`/api/booking/slots?month=${key}`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<Month>) : Promise.reject()))
      .then((result) => setMonths((current) => ({ ...current, [key]: result })))
      .catch((error) => {
        if (error?.name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, [key, months]);

  const times = useMemo(() => (pickedDate ? (data?.days[pickedDate] ?? []) : []), [data, pickedDate]);
  const loading = !data && !failed;

  return (
    <div className="grid gap-5">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarClock className="size-5" aria-hidden="true" /> Schedule a call (optional)
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
      </div>

      {failed || (data && !data.enabled) ? (
        <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          Online booking isn&apos;t available right now. Send your message and we&apos;ll arrange a time by email.
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-[auto_1fr]">
          <div className="mx-auto rounded-lg border md:mx-0">
            <Calendar
              mode="single"
              month={month}
              onMonthChange={setMonth}
              selected={pickedDate ? new Date(`${pickedDate}T12:00:00`) : undefined}
              onSelect={(date) => {
                if (!date) return;
                setPickedDate(localKey(date));
                onChange(null);
              }}
              disabled={(date) => !data?.days[localKey(date)]}
            />
          </div>

          <div className="grid content-start gap-4" aria-live="polite">
            {loading && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Loading free times…
              </p>
            )}
            {!loading && !pickedDate && (
              <p className="text-sm text-muted-foreground">Choose a highlighted day to see the free times.</p>
            )}
            {pickedDate && (
              <div>
                <p className="mb-2 text-sm font-medium">
                  {new Intl.DateTimeFormat("en-PH", { dateStyle: "full" }).format(new Date(`${pickedDate}T12:00:00`))}
                </p>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {times.map((iso) => {
                    const chosen = value?.start === iso;
                    return (
                      <li key={iso}>
                        <Button
                          type="button"
                          variant={chosen ? "default" : "outline"}
                          size="sm"
                          aria-pressed={chosen}
                          className="w-full cursor-pointer"
                          onClick={() => onChange({ start: iso, mode: value?.mode ?? "video" })}
                        >
                          {timeLabel(iso)}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">All times are Philippine time (UTC+8).</p>
              </div>
            )}

            {value && (
              <div className="grid gap-2">
                <p className="text-sm font-medium">How should we talk?</p>
                <div role="radiogroup" aria-label="Type of meeting" className="flex flex-wrap gap-2">
                  {MODES.map(({ value: mode, label, icon: Icon }) => (
                    <Button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={value.mode === mode}
                      variant={value.mode === mode ? "default" : "outline"}
                      size="sm"
                      className={cn("cursor-pointer")}
                      onClick={() => onChange({ ...value, mode })}
                    >
                      <Icon aria-hidden="true" /> {label}
                    </Button>
                  ))}
                </div>
                <Button type="button" variant="ghost" size="sm" className="w-fit cursor-pointer" onClick={() => { onChange(null); setPickedDate(undefined); }}>
                  <X aria-hidden="true" /> Don&apos;t book a time
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
