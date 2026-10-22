import { z, type ZodType } from "zod";
import { baseContactSchema, businessInfoStepSchema, goalsAreaStepSchema, goalsSystemsStepSchema, type ContactFormData } from "@/features/crm/contact";
import type { StepId } from "@/components/marketing/contact/types";

export const STEP_SCHEMAS: Record<StepId, ZodType> = {
  personal: baseContactSchema.pick({
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    buildingFor: true,
  }),
  business: businessInfoStepSchema,
  challenges: baseContactSchema.pick({ challenges: true, challengesOther: true }),
  goalsArea: goalsAreaStepSchema,
  goalsSystems: goalsSystemsStepSchema,
  // Optional: nothing to validate, it only sends the enquiry with or without a time.
  schedule: z.object({}),
  final: baseContactSchema.pick({
    budget: true,
    timeline: true,
    referralSource: true,
    notes: true,
  }),
};

export const STEP_FIELDS: Record<StepId, (keyof ContactFormData)[]> = {
  personal: ["firstName", "lastName", "email", "phone", "buildingFor"],
  business: [
    "businessName",
    "industry",
    "industryOther",
    "position",
    "positionOther",
    "businessSize",
    "yearsOperating",
    "officeAddress",
  ],
  challenges: ["challenges", "challengesOther"],
  goalsArea: ["goalsCategory"],
  goalsSystems: ["goals"],
  schedule: [],
  final: ["budget", "timeline", "referralSource", "notes"],
};
