import type { BookingSettings } from "@/features/cms/types";

/**
 * Which times can be booked. Pure (no database, no clock of its own) so the contact form, the
 * dashboard and the tests all agree. Everything is Philippine time, which has no daylight saving,
 * so a fixed offset of UTC+8 is exact and no time-zone library is needed.
 */

export const BOOKING_TIME_ZONE = "Asia/Manila";
const OFFSET_MS = 8 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

export interface Interval {
  start: Date;
  end: Date;
}

/** "2026-11-03": the calendar date a moment falls on, read on a clock in Manila. */
export const manilaDate = (moment: Date) =>
  new Date(moment.getTime() + OFFSET_MS).toISOString().slice(0, 10);

/** The moment that a Manila wall clock shows `hhmm` on `date`. */
export function fromManila(date: string, hhmm: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes) - OFFSET_MS);
}

/** The time of day on a Manila clock, "HH:MM". */
export const manilaTime = (moment: Date) =>
  new Date(moment.getTime() + OFFSET_MS).toISOString().slice(11, 16);

/** 0 is Sunday. `date` is a Manila calendar date. */
export function weekdayOf(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/**
 * The start times that can be booked on one Manila date: inside that weekday's hours, not on a day
 * off, far enough from now, not too far ahead, and clear of meetings already booked (and the gap
 * around them). A slot must end before the day closes.
 */
export function slotsForDate(
  date: string,
  settings: BookingSettings,
  busy: Interval[],
  now: Date,
): Date[] {
  if (!settings.enabled) return [];
  if (settings.blockedDates.some((blocked) => blocked.date === date)) return [];
  const day = settings.hours[weekdayOf(date)];
  if (!day?.open) return [];

  const opens = fromManila(date, day.start);
  const closes = fromManila(date, day.end);
  const earliest = new Date(now.getTime() + settings.minNoticeHours * 60 * MINUTE);
  const latest = fromManila(addDays(manilaDate(now), settings.maxDaysAhead), "23:59");
  const length = settings.slotMinutes * MINUTE;
  const gap = settings.bufferMinutes * MINUTE;
  const guarded = busy.map((interval) => ({
    start: new Date(interval.start.getTime() - gap),
    end: new Date(interval.end.getTime() + gap),
  }));

  const slots: Date[] = [];
  for (let start = opens.getTime(); start + length <= closes.getTime(); start += length) {
    const slot = { start: new Date(start), end: new Date(start + length) };
    if (slot.start < earliest || slot.start > latest) continue;
    if (guarded.some((interval) => overlaps(slot, interval))) continue;
    slots.push(slot.start);
  }
  return slots;
}

/** Every date from `from` through `to` (inclusive) with at least one free slot, and those slots. */
export function slotsByDate(
  from: string,
  to: string,
  settings: BookingSettings,
  busy: Interval[],
  now: Date,
): Record<string, Date[]> {
  const result: Record<string, Date[]> = {};
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const slots = slotsForDate(date, settings, busy, now);
    if (slots.length > 0) result[date] = slots;
  }
  return result;
}

/** Is this exact start time one of the offered slots? Used to re-check a booking when it is submitted. */
export function isOfferedSlot(
  start: Date,
  settings: BookingSettings,
  busy: Interval[],
  now: Date,
): boolean {
  return slotsForDate(manilaDate(start), settings, busy, now).some(
    (slot) => slot.getTime() === start.getTime(),
  );
}

/** "Tue, 3 Nov 2026, 9:00 AM": for people, in Manila time. */
export function formatManila(moment: Date, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: BOOKING_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(moment);
}

export const formatManilaTime = (moment: Date) =>
  new Intl.DateTimeFormat("en-PH", {
    timeZone: BOOKING_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(moment);
