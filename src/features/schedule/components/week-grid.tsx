"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { weekDays } from "../calendar";
import { manilaTime } from "../slots";
import type { MeetingView } from "../types";
import { CHIP_TONE } from "./tones";

const FIRST_HOUR = 7;
const LAST_HOUR = 20;
const ROW = 56; // px per hour
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const hourLabel = (hour: number) =>
  new Intl.DateTimeFormat("en-PH", { hour: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, 0, 1, hour)),
  );

/** The week as a time grid: one column per day, each meeting a block sized by its length. */
export function WeekGrid({
  date,
  today,
  byDay,
}: {
  date: string;
  today: string;
  byDay: Map<string, MeetingView[]>;
}) {
  const days = weekDays(date);
  return (
    <div className="bg-card overflow-x-auto rounded-xl border">
      <div className="min-w-[44rem]">
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b text-center text-xs">
          <div />
          {days.map((day) => (
            <Link
              key={day}
              href={`?view=week&date=${day}`}
              scroll={false}
              aria-current={day === date ? "date" : undefined}
              className={cn("py-2 font-medium", day === date && "bg-accent/60")}
            >
              <span className="text-muted-foreground block">
                {new Intl.DateTimeFormat("en-PH", { weekday: "short", timeZone: "UTC" }).format(
                  new Date(`${day}T00:00:00Z`),
                )}
              </span>
              <span
                className={cn(
                  "mx-auto flex size-7 items-center justify-center rounded-full text-sm",
                  day === today && "bg-primary text-primary-foreground",
                )}
              >
                {Number(day.slice(8))}
              </span>
            </Link>
          ))}
        </div>
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)]">
          <div>
            {HOURS.map((hour) => (
              <div
                key={hour}
                style={{ height: ROW }}
                className="text-muted-foreground pr-2 text-right text-[0.7rem]"
              >
                <span className="relative -top-2">{hourLabel(hour)}</span>
              </div>
            ))}
          </div>
          {days.map((day) => (
            <div
              key={day}
              className={cn("relative border-l", day === date && "bg-accent/30")}
              style={{ height: ROW * HOURS.length }}
            >
              {HOURS.map((hour, index) => (
                <div
                  key={hour}
                  style={{ top: index * ROW, height: ROW }}
                  className="absolute inset-x-0 border-t"
                />
              ))}
              {(byDay.get(day) ?? [])
                .filter((m) => m.status !== "cancelled")
                .map((meeting) => {
                  const start = minutes(manilaTime(new Date(meeting.startsAt)));
                  const length = Math.max(
                    20,
                    (new Date(meeting.endsAt).getTime() - new Date(meeting.startsAt).getTime()) /
                      60_000,
                  );
                  const top = Math.max(0, ((start - FIRST_HOUR * 60) / 60) * ROW);
                  const height = Math.max(22, (length / 60) * ROW - 2);
                  return (
                    <Link
                      key={meeting.id}
                      href={`?view=week&date=${day}`}
                      scroll={false}
                      style={{ top, height }}
                      className={cn(
                        "focus-visible:ring-ring absolute inset-x-0.5 overflow-hidden rounded-md border-l-2 border-current px-1.5 py-0.5 text-[0.7rem] leading-tight focus-visible:ring-2 focus-visible:outline-none",
                        CHIP_TONE[meeting.status],
                      )}
                    >
                      <span className="block truncate font-medium">{meeting.attendeeName}</span>
                      <span className="block truncate opacity-80">
                        {manilaTime(new Date(meeting.startsAt))} {meeting.title}
                      </span>
                    </Link>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
