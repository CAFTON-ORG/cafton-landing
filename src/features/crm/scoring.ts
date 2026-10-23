import {
  budgetRanges,
  businessSizes,
  positions,
  referralSources,
  timelines,
} from "./contact-options";

/**
 * Lead scoring: how ready an enquiry looks to become a deal, from what the contact form already
 * asks. Pure and explainable (every point has a reason a person can read), so a score is never a
 * black box and the rules can be tuned in one place. A score is a hint for who to call first, not a
 * verdict: qualifying a lead is still a human decision.
 */

export type LeadBand = "hot" | "warm" | "cold";

export const LEAD_BANDS: readonly LeadBand[] = ["hot", "warm", "cold"];
export const LEAD_BAND_LABEL: Record<LeadBand, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
};

/** Lowest score of each band. Anything below `warm` is cold. */
export const BAND_FLOOR = { hot: 60, warm: 35 } as const;

export const bandOf = (score: number): LeadBand =>
  score >= BAND_FLOOR.hot ? "hot" : score >= BAND_FLOOR.warm ? "warm" : "cold";

/** The score range a band covers, for filtering in the database. `max` is exclusive. */
export const bandRange = (band: LeadBand): { min?: number; max?: number } =>
  band === "hot"
    ? { min: BAND_FLOOR.hot }
    : band === "warm"
      ? { min: BAND_FLOOR.warm, max: BAND_FLOOR.hot }
      : { max: BAND_FLOOR.warm };

const BUDGET: Record<(typeof budgetRanges)[number], number> = {
  "Not sure yet": 4,
  "Under ₱100,000": 8,
  "₱100,000 - ₱300,000": 16,
  "₱300,000 - ₱500,000": 24,
  "₱500,000+": 30,
};

const TIMELINE: Record<(typeof timelines)[number], number> = {
  "As soon as possible": 25,
  "Within 1-3 months": 18,
  "Within 3-6 months": 8,
  "Just exploring for now": 2,
};

const BUSINESS_SIZE: Record<(typeof businessSizes)[number], number> = {
  "Just me": 2,
  "2-10 employees": 6,
  "11-50 employees": 9,
  "51-200 employees": 11,
  "200+ employees": 12,
};

/** Decision-making power: owners and executives decide, others influence. */
const POSITION: Record<(typeof positions)[number], number> = {
  "Owner / Founder": 10,
  "C-level (CEO, COO, CTO, etc.)": 10,
  "Manager / Team Lead": 6,
  Employee: 3,
  Other: 2,
};

/** People who already trust us close more often. */
const REFERRAL: Partial<Record<(typeof referralSources)[number], number>> = {
  "Existing client": 8,
  "Referral from someone": 8,
  "Event or community": 4,
};

/** Addresses anyone can get: a work address is a (small) sign of a real organisation. */
const FREE_EMAIL = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.com.ph",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
]);

export interface ScoreInput {
  budget?: string | null;
  timeline?: string | null;
  phone?: string | null;
  email: string;
  businessName?: string | null;
  /** The contact form's answers, as stored on the lead. */
  answers?: Record<string, unknown> | null;
}

export interface ScoreReason {
  label: string;
  points: number;
}

export interface LeadScore {
  /** 0 to 100. */
  score: number;
  band: LeadBand;
  /** What earned the points, biggest first. Empty when nothing is known. */
  reasons: ScoreReason[];
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Looks `value` up in a table keyed by the form's own option text; anything else scores nothing. */
const lookup = <T extends string>(table: Partial<Record<T, number>>, value: string): number =>
  (table as Record<string, number | undefined>)[value] ?? 0;

export function scoreLead(input: ScoreInput): LeadScore {
  const answers = input.answers ?? {};
  const emailDomain = input.email.split("@")[1]?.trim().toLowerCase() ?? "";

  const candidates: ScoreReason[] = [
    {
      label: input.budget ? `Budget: ${input.budget}` : "",
      points: lookup(BUDGET, input.budget ?? ""),
    },
    {
      label: input.timeline ? `Timeline: ${input.timeline}` : "",
      points: lookup(TIMELINE, input.timeline ?? ""),
    },
    {
      label: text(answers.businessSize) ? `Business size: ${text(answers.businessSize)}` : "",
      points: lookup(BUSINESS_SIZE, text(answers.businessSize)),
    },
    {
      label: text(answers.position) ? `Role: ${text(answers.position)}` : "",
      points: lookup(POSITION, text(answers.position)),
    },
    {
      label: text(answers.referralSource)
        ? `Found us through: ${text(answers.referralSource)}`
        : "",
      points: lookup(REFERRAL, text(answers.referralSource)),
    },
    { label: "Gave a phone number", points: input.phone?.trim() ? 4 : 0 },
    { label: "Has a business name", points: input.businessName?.trim() ? 4 : 0 },
    {
      label: "Uses a work email address",
      points: emailDomain && !FREE_EMAIL.has(emailDomain) ? 4 : 0,
    },
  ];

  const reasons = candidates
    .filter((reason) => reason.points > 0 && reason.label)
    .sort((a, b) => b.points - a.points);
  const score = Math.min(
    100,
    reasons.reduce((sum, reason) => sum + reason.points, 0),
  );
  return { score, band: bandOf(score), reasons };
}
