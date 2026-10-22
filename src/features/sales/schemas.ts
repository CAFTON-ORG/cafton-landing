import { z } from "zod";

import { parseMinor } from "@/lib/money";
import { parseQuantity } from "./pricing";
import { PRICING_MODELS } from "./types";

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  text(max)
    .optional()
    .transform((value) => value || undefined);

/** Pesos as a person types them ("12,500.50"); stored as centavos. */
const money = z
  .string()
  .trim()
  .min(1, "Enter an amount.")
  .transform((value, context) => {
    const minor = parseMinor(value);
    if (minor === null) {
      context.addIssue({ code: "custom", message: "Enter an amount like 12,500.50." });
      return z.NEVER;
    }
    if (minor > 99_999_999_999) {
      context.addIssue({ code: "custom", message: "That amount is too large." });
      return z.NEVER;
    }
    return minor;
  });

export const catalogItemSchema = z.object({
  name: text(120).min(1, "Give it a name."),
  description: optionalText(1000),
  pricingModel: z.enum(PRICING_MODELS as [string, ...string[]]),
  price: money,
  unitLabel: text(30).min(1, "Say what one unit is (project, hour, month)."),
  taxable: z.boolean(),
  active: z.boolean(),
});
export type CatalogItemInput = z.input<typeof catalogItemSchema>;

const quantity = z
  .string()
  .trim()
  .transform((value, context) => {
    const milli = parseQuantity(value);
    if (milli === null) {
      context.addIssue({ code: "custom", message: "A quantity such as 1 or 2.5." });
      return z.NEVER;
    }
    return milli;
  });

export const quoteLineSchema = z.object({
  catalogItemId: z
    .string()
    .optional()
    .transform((value) => (value && value !== "none" ? value : undefined)),
  description: text(500).min(1, "Describe what is being sold."),
  quantity,
  unitLabel: text(30).min(1, "Unit."),
  price: money,
  discountPct: z.coerce.number().int().min(0, "0 to 100.").max(100, "0 to 100."),
  taxable: z.boolean(),
});

export const quoteSchema = z.object({
  title: text(200).min(1, "Give the quote a title."),
  intro: optionalText(2000),
  terms: optionalText(8000),
  paymentTerms: optionalText(2000),
  /** Percent of the total due when the quote is accepted. */
  depositPct: z.coerce.number().int().min(0, "0 to 100.").max(100, "0 to 100."),
  /** yyyy-mm-dd, or empty for no end date. */
  validUntil: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Pick a date.")
    .transform((value) => value || undefined),
  lines: z.array(quoteLineSchema).max(100, "A quote can have at most 100 lines."),
});
export type QuoteInput = z.input<typeof quoteSchema>;

export const respondSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("accept"),
    token: z.string().min(20).max(80),
    name: text(120).min(2, "Type your full name."),
    email: z
      .string()
      .trim()
      .max(200)
      .email("Enter your email address.")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    agreed: z.literal(true, { error: "Tick the box to accept." }),
  }),
  z.object({
    action: z.literal("decline"),
    token: z.string().min(20).max(80),
    reason: text(1000).min(1, "Tell us briefly why, so we can improve."),
  }),
]);
export type RespondInput = z.input<typeof respondSchema>;
