import { z } from "zod";

import { unknownFields } from "../rules/merge";
import { CONTRACT_KINDS, MAX_BODY_LENGTH } from "../rules/core";

const text = (max: number) => z.string().trim().max(max);

export const templateSchema = z.object({
  name: text(120).min(1, "Give the template a name."),
  kind: z.enum(CONTRACT_KINDS),
  body: text(MAX_BODY_LENGTH)
    .min(1, "Write the wording.")
    .superRefine((value, context) => {
      const unknown = unknownFields(value);
      if (unknown.length > 0) {
        context.addIssue({
          code: "custom",
          message: `Unknown merge ${unknown.length === 1 ? "field" : "fields"}: ${unknown
            .map((key) => `{{${key}}}`)
            .join(", ")}.`,
        });
      }
    }),
  active: z.boolean(),
});
export type TemplateInput = z.input<typeof templateSchema>;

export const contractSchema = z.object({
  title: text(200).min(1, "Give the contract a title."),
  body: text(MAX_BODY_LENGTH).min(1, "Write the wording."),
  /** yyyy-mm-dd, or empty for none yet. */
  validUntil: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Pick a date.")
    .transform((value) => value || undefined),
});
export type ContractInput = z.input<typeof contractSchema>;

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
    agreed: z.literal(true, { error: "Tick the box to sign." }),
  }),
  z.object({
    action: z.literal("decline"),
    token: z.string().min(20).max(80),
    reason: text(1000).min(1, "Tell us briefly why, so we can improve."),
  }),
]);
export type RespondInput = z.input<typeof respondSchema>;
