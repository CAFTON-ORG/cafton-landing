import type { CaftonEvent, EventStatus } from "@/types/content";

export function getEventFacts(event: CaftonEvent): [string, string][] {
  if (event.facts) return event.facts;
  return [
    ["When", formatEventDates(event)],
    ["Prizes", `${event.prizes.length} winners`],
    ["Enter", "Online, through Gleam"],
  ];
}

export function getEventStatus(
  event: CaftonEvent,
  now: Date = new Date(),
): EventStatus {
  if (event.closed) return "closed";
  if (event.endsAt && now > new Date(event.endsAt)) return "closed";
  if (event.startsAt && now < new Date(event.startsAt)) return "upcoming";
  return "open";
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "Asia/Manila",
});

export function formatEventDates(event: CaftonEvent): string {
  const { startsAt, endsAt } = event;
  if (startsAt && endsAt) {
    return `${dateFormat.format(new Date(startsAt))} to ${dateFormat.format(new Date(endsAt))}`;
  }
  if (endsAt) return `Ends ${dateFormat.format(new Date(endsAt))}`;
  if (startsAt) return `Starts ${dateFormat.format(new Date(startsAt))}`;
  return event.closed ? "Completed" : "Dates to be announced";
}
