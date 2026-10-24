/**
 * Small rules for the home overview: how to greet someone, and how to order what needs their
 * attention. Pure.
 */

export type Tone = "danger" | "warning" | "neutral";

/** One line of "Needs your attention": what is wrong, where to fix it, how pressing. */
export interface AttentionItem {
  text: string;
  detail?: string;
  href: string;
  tone: Tone;
}

/** The hour (0 to 23) in Manila, whatever the server's own clock is set to. */
export function manilaHour(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Manila",
    }).format(now),
  );
}

/** "Good morning" until noon, "Good afternoon" until 6, "Good evening" after. */
export function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** The first word of a name, for greeting someone; empty names fall back to "there". */
export const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

/** "Saturday, 24 October 2026", in Manila. */
export function longManilaDate(now: Date): string {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "Asia/Manila" }).format(now);
  return `${part({ weekday: "long" })}, ${part({ day: "numeric" })} ${part({ month: "long" })} ${part({ year: "numeric" })}`;
}

const ORDER: Record<Tone, number> = { danger: 0, warning: 1, neutral: 2 };

/** Most pressing first, keeping the order given within each level, and no more than `limit`. */
export function rankAttention<T extends { tone: Tone }>(items: readonly T[], limit = 8): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => ORDER[a.item.tone] - ORDER[b.item.tone] || a.index - b.index)
    .slice(0, limit)
    .map(({ item }) => item);
}

/** "1 invoice", "3 invoices". */
export const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Hours and minutes of logged time, as people say it: "6h 30m", "40h", "45m". */
export function hoursAndMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** A share of a total as a width from 0 to 100, never wider than the bar and never invisible when there is something. */
export function barWidth(value: number, top: number): number {
  if (value <= 0 || top <= 0) return 0;
  return Math.min(100, Math.max(3, Math.round((value / top) * 100)));
}
