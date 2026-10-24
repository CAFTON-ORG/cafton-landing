/**
 * Billing approved time: which hourly rate applies, how minutes become billable hours, and what an
 * invoice for a batch of time looks like. Pure: no database. Money is whole centavos.
 */

import { lineAmount } from "./invoicing";
import { longDate } from "./reports";

/** Rates that could apply to one person's time on one project, most specific first. */
export interface RateSources {
  personOnProject?: number | null;
  project?: number | null;
  person?: number | null;
  default?: number | null;
}

export type RateSource = "personOnProject" | "project" | "person" | "default";

export const RATE_SOURCE_LABEL: Record<RateSource, string> = {
  personOnProject: "Set for this person on this project",
  project: "Set for this project",
  person: "Set for this person",
  default: "The standard rate",
};

/**
 * The rate to bill at: the most specific one that is set. A person's rate on a project beats the
 * project's rate, which beats the person's own rate, which beats the business's standard rate.
 * Nothing set means no rate (and no invoice until one is).
 */
export function resolveRate(
  sources: RateSources,
): { rateMinor: number; source: RateSource } | null {
  const order: [RateSource, number | null | undefined][] = [
    ["personOnProject", sources.personOnProject],
    ["project", sources.project],
    ["person", sources.person],
    ["default", sources.default],
  ];
  for (const [source, rate] of order) {
    if (typeof rate === "number" && Number.isSafeInteger(rate) && rate > 0)
      return { rateMinor: rate, source };
  }
  return null;
}

/** Billable hours in thousandths, rounded to the nearest hundredth of an hour: 100 minutes is 1.67 hours. */
export const billableMilli = (minutes: number) => Math.round((minutes / 60) * 100) * 10;

/** "1.67" for 1670. */
export const hoursText = (milli: number) => (milli / 1000).toFixed(2).replace(/\.?0+$/, "") || "0";

export interface TimeEntryLite {
  id: string;
  profileId: string;
  personName: string;
  minutes: number;
  workDate: string;
}

export interface TimeLine {
  profileId: string;
  personName: string;
  description: string;
  quantityMilli: number;
  unitPriceMinor: number;
  amountMinor: number;
  rateSource: RateSource;
  entryIds: string[];
  minutes: number;
}

/**
 * One invoice line per person: their hours at their rate. People with no rate to bill at are
 * listed in `missing` instead, so the invoice isn't made with time left out silently.
 */
export function buildTimeLines(input: {
  projectName: string;
  entries: readonly TimeEntryLite[];
  rateFor: (profileId: string) => { rateMinor: number; source: RateSource } | null;
}): {
  lines: TimeLine[];
  missing: { profileId: string; personName: string }[];
  totalMinutes: number;
} {
  const byPerson = new Map<string, TimeEntryLite[]>();
  for (const entry of input.entries)
    byPerson.set(entry.profileId, [...(byPerson.get(entry.profileId) ?? []), entry]);

  const lines: TimeLine[] = [];
  const missing: { profileId: string; personName: string }[] = [];
  for (const [profileId, entries] of byPerson) {
    const personName = entries[0].personName;
    const rate = input.rateFor(profileId);
    if (!rate) {
      missing.push({ profileId, personName });
      continue;
    }
    const minutes = entries.reduce((sum, entry) => sum + entry.minutes, 0);
    const quantityMilli = billableMilli(minutes);
    if (quantityMilli <= 0) continue; // under three minutes rounds to nothing
    const dates = entries.map((entry) => entry.workDate).sort();
    const first = dates[0];
    const last = dates.at(-1)!;
    lines.push({
      profileId,
      personName,
      description: `${input.projectName}: ${personName}, ${first === last ? longDate(first) : `${longDate(first)} to ${longDate(last)}`}`,
      quantityMilli,
      unitPriceMinor: rate.rateMinor,
      amountMinor: lineAmount(quantityMilli, rate.rateMinor),
      rateSource: rate.source,
      entryIds: entries.map((entry) => entry.id),
      minutes,
    });
  }
  lines.sort((a, b) => a.personName.localeCompare(b.personName));
  missing.sort((a, b) => a.personName.localeCompare(b.personName));
  return {
    lines,
    missing,
    totalMinutes: input.entries.reduce((sum, entry) => sum + entry.minutes, 0),
  };
}

/** Why a standard rate or a billing rate can't be saved, or null. */
export function checkRate(rateMinor: number): string | null {
  if (!Number.isSafeInteger(rateMinor) || rateMinor <= 0)
    return "Enter a rate above zero, like 1,500 an hour.";
  if (rateMinor > 100_000_000) return "That rate looks too high. Check the amount.";
  return null;
}
