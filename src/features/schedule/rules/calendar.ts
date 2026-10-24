import { addDays, weekdayOf } from "./slots";

/** Calendar layout helpers. Dates are "YYYY-MM-DD" (Manila); weeks start on Sunday. */

export const startOfWeek = (date: string) => addDays(date, -weekdayOf(date));

/** The seven days of the week that holds `date`. */
export const weekDays = (date: string) =>
  Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(date), index));

/** Every day shown for the month of `date`: whole weeks, 5 or 6 of them. */
export function monthGrid(date: string): string[] {
  const first = `${date.slice(0, 7)}-01`;
  const start = startOfWeek(first);
  const nextMonth = addDays(`${date.slice(0, 7)}-28`, 4).slice(0, 7);
  const last = addDays(`${nextMonth}-01`, -1);
  const end = addDays(startOfWeek(last), 6);
  const days: string[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

/** The first of the previous or next month. */
export function shiftMonth(date: string, by: number): string {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + by, 1)).toISOString().slice(0, 10);
}
