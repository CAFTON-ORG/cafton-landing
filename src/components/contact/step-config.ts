import type { ZodType } from "zod";
import { baseContactSchema, businessInfoStepSchema, goalsAreaStepSchema, goalsSystemsStepSchema, type ContactFormData } from "@/lib/contact";
import type { StepId } from "@/components/contact/types";

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
  final: ["budget", "timeline", "referralSource", "notes"],
};
