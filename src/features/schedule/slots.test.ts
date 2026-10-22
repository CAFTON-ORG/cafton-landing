import { describe, expect, it } from "vitest";

import { booking } from "@/features/cms/content/booking";
import type { BookingSettings } from "@/features/cms/types";
import {
  addDays,
  formatManila,
  fromManila,
  isOfferedSlot,
  manilaDate,
  manilaTime,
  slotsByDate,
  slotsForDate,
  weekdayOf,
} from "./slots";

const settings: BookingSettings = {
  ...booking,
  minNoticeHours: 0,
  bufferMinutes: 0,
  maxDaysAhead: 60,
};
// Monday 2 November 2026, 06:00 in Manila.
const now = fromManila("2026-11-02", "06:00");
const times = (slots: Date[]) => slots.map(manilaTime);

describe("Philippine time", () => {
  it("reads and writes a Manila wall clock exactly (UTC+8)", () => {
    expect(fromManila("2026-11-03", "09:00").toISOString()).toBe("2026-11-03T01:00:00.000Z");
    expect(manilaDate(new Date("2026-11-03T17:30:00Z"))).toBe("2026-11-04"); // 01:30 the next day in Manila
    expect(manilaTime(new Date("2026-11-03T01:00:00Z"))).toBe("09:00");
  });

  it("knows the weekday of a date and adds days across month ends", () => {
    expect(weekdayOf("2026-11-02")).toBe(1);
    expect(weekdayOf("2026-11-01")).toBe(0);
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
  });

  it("formats for people in Manila time", () => {
    expect(formatManila(new Date("2026-11-03T01:00:00Z"))).toMatch(/9:00\s?am/i);
  });
});

describe("slots for a day", () => {
  it("offers the working hours in steps of the call length, ending before closing", () => {
    const slots = times(slotsForDate("2026-11-03", settings, [], now));
    expect(slots[0]).toBe("09:00");
    expect(slots.at(-1)).toBe("16:30");
    expect(slots).toHaveLength(16);
  });

  it("offers nothing on a closed weekday, a day off, or when booking is switched off", () => {
    expect(slotsForDate("2026-11-01", settings, [], now)).toEqual([]); // Sunday
    expect(
      slotsForDate(
        "2026-11-03",
        { ...settings, blockedDates: [{ date: "2026-11-03", reason: "Holiday" }] },
        [],
        now,
      ),
    ).toEqual([]);
    expect(slotsForDate("2026-11-03", { ...settings, enabled: false }, [], now)).toEqual([]);
  });

  it("respects the earliest booking time and how far ahead people may book", () => {
    const soon = { ...settings, minNoticeHours: 5 }; // now is 06:00, so nothing before 11:00 today
    expect(times(slotsForDate("2026-11-02", soon, [], now))[0]).toBe("11:00");
    expect(slotsForDate("2026-12-31", { ...settings, maxDaysAhead: 10 }, [], now)).toEqual([]);
  });

  it("leaves out booked times and the gap around them", () => {
    const busy = [
      { start: fromManila("2026-11-03", "10:00"), end: fromManila("2026-11-03", "10:30") },
    ];
    expect(times(slotsForDate("2026-11-03", settings, busy, now))).not.toContain("10:00");
    const gap = times(slotsForDate("2026-11-03", { ...settings, bufferMinutes: 30 }, busy, now));
    expect(gap).not.toContain("09:30");
    expect(gap).not.toContain("10:30");
    expect(gap).toContain("09:00");
    expect(gap).toContain("11:00");
  });

  it("lists only the days that have a free slot", () => {
    const days = slotsByDate("2026-11-02", "2026-11-08", settings, [], now);
    expect(Object.keys(days)).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
    ]);
  });

  it("re-checks a chosen time: offered times pass, taken or odd ones fail", () => {
    const busy = [
      { start: fromManila("2026-11-03", "10:00"), end: fromManila("2026-11-03", "10:30") },
    ];
    expect(isOfferedSlot(fromManila("2026-11-03", "09:30"), settings, busy, now)).toBe(true);
    expect(isOfferedSlot(fromManila("2026-11-03", "10:00"), settings, busy, now)).toBe(false);
    expect(isOfferedSlot(fromManila("2026-11-03", "09:10"), settings, busy, now)).toBe(false);
    expect(isOfferedSlot(fromManila("2026-11-01", "09:00"), settings, busy, now)).toBe(false);
  });
});
