"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { monthGrid } from "../calendar";
import { formatManilaTime } from "../slots";
import type { MeetingView } from "../types";
import { CHIP_TONE } from "./tones";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS = 3;

const longDate = (day: string) =>
  new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );

/** The month as a grid, like Google Calendar: a chip per meeting, "+n more" when a day is full. */
export function MonthGrid({
  date,
  today,
  byDay,
}: {
  date: string;
  today: string;
  byDay: Map<string, MeetingView[]>;
}) {
  const cells = monthGrid(date);
  const month = date.slice(0, 7);
  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <div className="text-muted-foreground grid grid-cols-7 border-b text-center text-xs font-medium">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, index) => {
          const items = (byDay.get(day) ?? []).filter((m) => m.status !== "cancelled");
          const shown = items.slice(0, MAX_CHIPS);
          return (
            <div
              key={day}
              className={cn(
                "relative min-h-24 border-b p-1 sm:min-h-28",
                index % 7 !== 6 && "border-r",
                day.slice(0, 7) !== month && "bg-muted/30 text-muted-foreground",
                day === date && "bg-accent/60",
              )}
            >
              <Link
                href={`?view=month&date=${day}`}
                scroll={false}
                aria-label={`${longDate(day)}, ${items.length} ${items.length === 1 ? "meeting" : "meetings"}`}
                aria-current={day === date ? "date" : undefined}
                className="focus-visible:ring-ring absolute inset-0 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
              />
              <span
                className={cn(
                  "pointer-events-none relative flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  day === today && "bg-primary text-primary-foreground",
                )}
              >
                {Number(day.slice(8))}
              </span>
              <ul className="pointer-events-none relative mt-0.5 hidden gap-0.5 sm:grid">
                {shown.map((meeting) => (
                  <li
                    key={meeting.id}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[0.7rem] leading-tight font-medium",
                      CHIP_TONE[meeting.status],
                    )}
                  >
                    {formatManilaTime(new Date(meeting.startsAt))} {meeting.attendeeName}
                  </li>
                ))}
                {items.length > MAX_CHIPS && (
                  <li className="text-muted-foreground px-1 text-[0.7rem]">
                    +{items.length - MAX_CHIPS} more
                  </li>
                )}
              </ul>
              {items.length > 0 && (
                <span
                  className="pointer-events-none relative mt-1 flex gap-0.5 sm:hidden"
                  aria-hidden="true"
                >
                  {items.slice(0, 3).map((meeting) => (
                    <span
                      key={meeting.id}
                      className={cn("size-1.5 rounded-full", CHIP_TONE[meeting.status])}
                    />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
