import { MAX_DISCOUNT_PCT_WITHOUT_APPROVAL, MAX_VALID_DAYS } from "./core";

/**
 * The short lists behind the quote and catalog dropdowns. One source, so the editor, the catalog
 * and any later screen offer the same choices. A value an older quote already holds that is not on
 * a list stays selectable (see `PresetSelect`); these lists are suggestions, the server still
 * validates the real rules.
 */

export const UNITS = [
  "project",
  "hour",
  "day",
  "week",
  "month",
  "year",
  "item",
  "page",
  "user",
  "license",
] as const;

export const DISCOUNTS = ["0", "5", "10", "15", "20", "25", "30", "40", "50"] as const;

export const DEPOSITS = ["0", "25", "30", "40", "50", "60", "70", "100"] as const;

/** Quick picks for "valid for", never longer than a quote may stay open. */
export const VALID_FOR_DAYS = [7, 14, 30, 45, 60, 90].filter((days) => days <= MAX_VALID_DAYS);

export interface PaymentWording {
  name: string;
  text: string;
}

/** Standard payment terms. Wording a person can still edit after choosing it. */
export const PAYMENT_WORDINGS: readonly PaymentWording[] = [
  {
    name: "Deposit, balance on completion",
    text: "The deposit is due when the quote is accepted. The balance is due on completion. Payment by bank transfer; details are on the invoice.",
  },
  {
    name: "Full payment upfront",
    text: "The full amount is due when the quote is accepted. Work starts once payment is received.",
  },
  {
    name: "Monthly, on the 1st",
    text: "Billed monthly in advance, due on the 1st of each month. Payment by bank transfer; details are on the invoice.",
  },
  {
    name: "Milestones (50 / 30 / 20)",
    text: "50% on acceptance, 30% when the first version is delivered, and 20% on completion.",
  },
  { name: "Net 15 days", text: "Payment is due within 15 days of the invoice date." },
  { name: "Net 30 days", text: "Payment is due within 30 days of the invoice date." },
];

/** A discount option's label: it says when the percent needs a second person's approval. */
export function discountLabel(value: string): string {
  return Number(value) > MAX_DISCOUNT_PCT_WITHOUT_APPROVAL ? `${value} · needs approval` : value;
}
