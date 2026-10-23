import type { RateSource } from "./billing";

/** Projects with approved, billable time nobody has invoiced yet (plain data for the new-invoice dialog). */
export interface BillableTimeProject {
  projectId: string;
  projectName: string;
  minutes: number;
  /** The latest day any of it was worked. */
  latestDate: string;
  people: {
    profileId: string;
    name: string;
    minutes: number;
    /** What an hour would be billed at, or null when no rate is set for this person here. */
    rateMinor: number | null;
    source: RateSource | null;
  }[];
}
