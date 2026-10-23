"use client";

import { TabCount } from "@/components/dashboard/shared/tab-count";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
} from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { SegmentedNav } from "@/components/dashboard/shared/segmented-nav";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import type { PersonRef } from "@/features/crm/types";
import { cn } from "@/lib/utils";
import { shiftMonth, startOfWeek } from "../calendar";
import { addDays, manilaDate } from "../slots";
import type { MeetingView } from "../types";
import { CalendarFeed } from "./calendar-feed";
import { MeetingCard } from "./meeting-card";
import { MeetingDialog } from "./meeting-dialog";
import { MonthGrid } from "./month-grid";
import { CHIP_TONE } from "./tones";
import { WeekGrid } from "./week-grid";

export type ScheduleViewMode = "month" | "week";

const heading = (view: ScheduleViewMode, date: string) => {
  const format = (day: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-PH", { ...options, timeZone: "UTC" }).format(
      new Date(`${day}T00:00:00Z`),
    );
  if (view === "month") return format(date, { month: "long", year: "numeric" });
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  return `${format(start, { month: "short", day: "numeric" })} – ${format(end, { month: "short", day: "numeric", year: "numeric" })}`;
};

/**
 * The schedule, laid out like the calendars people already know: a toolbar (today, previous and
 * next, month or week, who), the calendar itself, and beside it the chosen day's agenda with
 * the requests waiting for an answer. The view and the day live in the address (?view=&date=),
 * so a link shows the same thing and Back works.
 */
export function ScheduleView({
  view,
  date,
  today,
  meetings,
  requests,
  people,
}: {
  view: ScheduleViewMode;
  /** The chosen day, "YYYY-MM-DD" (Manila). */
  date: string;
  today: string;
  /** Every meeting in the calendar's range. */
  meetings: MeetingView[];
  requests: MeetingView[];
  people: PersonRef[];
}) {
  const canCreate = useCan("meetings:create");
  const canSettings = useCan("meetings:update");
  const [who, setWho] = useState("all");

  const shown = useMemo(
    () => (who === "all" ? meetings : meetings.filter((m) => m.ownerId === who)),
    [meetings, who],
  );
  const byDay = useMemo(() => {
    const map = new Map<string, MeetingView[]>();
    for (const meeting of shown) {
      const key = manilaDate(new Date(meeting.startsAt));
      map.set(key, [...(map.get(key) ?? []), meeting]);
    }
    return map;
  }, [shown]);

  const agenda = byDay.get(date) ?? [];
  const hosts = people.filter((person) => meetings.some((m) => m.ownerId === person.id));
  const back = view === "month" ? shiftMonth(date, -1) : addDays(date, -7);
  const forward = view === "month" ? shiftMonth(date, 1) : addDays(date, 7);
  const link = (day: string, mode: ScheduleViewMode = view) => `?view=${mode}&date=${day}`;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={link(today)} scroll={false} />}
        >
          Today
        </Button>
        <div className="flex">
          <Button
            variant="outline"
            size="icon"
            aria-label={view === "month" ? "Previous month" : "Previous week"}
            nativeButton={false}
            render={<Link href={link(back)} scroll={false} />}
            className="rounded-r-none"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={view === "month" ? "Next month" : "Next week"}
            nativeButton={false}
            render={<Link href={link(forward)} scroll={false} />}
            className="-ml-px rounded-l-none"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
        <h2 className="mr-auto text-lg font-semibold">{heading(view, date)}</h2>

        {hosts.length > 1 && (
          <Select value={who} onValueChange={(next) => setWho(next ?? "all")}>
            <SelectTrigger className="w-44" aria-label="Show the schedule of">
              <SelectValue>
                {(value: string) =>
                  value === "all"
                    ? "Everyone"
                    : (hosts.find((p) => p.id === value)?.name ?? "Everyone")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              {hosts.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <SegmentedNav
          label="Calendar view"
          items={[
            {
              href: link(date, "month"),
              label: "Month",
              icon: CalendarDays,
              active: view === "month",
            },
            {
              href: link(date, "week"),
              label: "Week",
              icon: CalendarRange,
              active: view === "week",
            },
          ]}
        />
        <CalendarFeed />
        {canSettings && (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/dashboard/crm/schedule/settings" />}
          >
            <Settings aria-hidden="true" /> Booking settings
          </Button>
        )}
        {canCreate && (
          <MeetingDialog people={people} defaults={{ date }} trigger={<Button />}>
            <Plus aria-hidden="true" /> New meeting
          </MeetingDialog>
        )}
      </div>

      <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-3">
          {view === "month" ? (
            <MonthGrid date={date} today={today} byDay={byDay} />
          ) : (
            <WeekGrid date={date} today={today} byDay={byDay} />
          )}
          <ul
            aria-label="Legend"
            className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs"
          >
            {(
              [
                ["requested", "Waiting for you"],
                ["confirmed", "Confirmed"],
                ["completed", "Held"],
                ["no_show", "No-show"],
              ] as const
            ).map(([status, label]) => (
              <li key={status} className="flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded-sm", CHIP_TONE[status])} /> {label}
              </li>
            ))}
          </ul>
        </div>

        <aside aria-label="Day agenda" className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeZone: "UTC" }).format(
                  new Date(`${date}T00:00:00Z`),
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {agenda.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Nothing scheduled"
                  description="Visitors can book from the contact form, or you can schedule a meeting."
                />
              ) : (
                agenda.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} people={people} />
                ))
              )}
            </CardContent>
          </Card>

          {requests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Waiting for you
                  <TabCount n={requests.length} />
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {requests.slice(0, 6).map((request) => (
                  <Link
                    key={request.id}
                    href={link(manilaDate(new Date(request.startsAt)))}
                    scroll={false}
                    className="hover:bg-accent/50 focus-visible:ring-ring rounded-lg border p-2.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="block font-medium">{request.attendeeName}</span>
                    <span className="text-muted-foreground block text-xs">
                      {new Intl.DateTimeFormat("en-PH", {
                        timeZone: "Asia/Manila",
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(request.startsAt))}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
