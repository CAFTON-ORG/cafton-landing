import { z } from "zod";
import { getServicePillar } from "@/lib/services";

export const buildingForOptions = [
  "An existing business",
  "A new idea or startup",
  "A personal or side project",
] as const;

export const industries = [
  "Retail",
  "Technology",
  "Food & Beverage",
  "Health & Wellness",
  "Education",
  "Real Estate & Property",
  "Construction & Field Services",
  "Other",
] as const;

export const positions = [
  "Owner / Founder",
  "C-level (CEO, COO, CTO, etc.)",
  "Manager / Team Lead",
  "Employee",
  "Other",
] as const;

export const businessSizes = [
  "Just me",
  "2-10 employees",
  "11-50 employees",
  "51-200 employees",
  "200+ employees",
] as const;

export const yearsOperating = [
  "Not yet operating",
  "Less than 1 year",
  "1-3 years",
  "3-5 years",
  "5-10 years",
  "10+ years",
] as const;

export const challengeOptions = [
  "We still rely on spreadsheets, paper, or group chats",
  "Our tools don't talk to each other",
  "Day-to-day operations take longer than they should",
  "We're not converting enough leads into sales",
  "Stock, orders, or fulfillment keep slipping through the cracks",
  "We can't see what's actually happening across the business",
  "Something else",
] as const;

export const referralSources = [
  "Search engine",
  "Social media",
  "Referral from someone",
  "Existing client",
  "Event or community",
  "Other",
] as const;

export const budgetRanges = [
  "Not sure yet",
  "Under ₱100,000",
  "₱100,000 - ₱300,000",
  "₱300,000 - ₱500,000",
  "₱500,000+",
] as const;

export const timelines = [
  "As soon as possible",
  "Within 1-3 months",
  "Within 3-6 months",
  "Just exploring for now",
] as const;

const baseContactSchema = z.object({
  // Step 1 -- Personal Information
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email")
    .max(254),
  phone: z.string().trim().max(50),
  buildingFor: z
    .enum(buildingForOptions)
    .or(z.literal(""))
    .refine((value) => value !== "", { message: "Let us know what this is for" }),

  // Step 2 -- Business Information (only required when buildingFor is "An existing business")
  businessName: z.string().trim().max(200),
  industry: z.enum(industries).or(z.literal("")),
  industryOther: z.string().trim().max(120),
  position: z.enum(positions).or(z.literal("")),
  positionOther: z.string().trim().max(120),
  businessSize: z.enum(businessSizes).or(z.literal("")),
  yearsOperating: z.enum(yearsOperating).or(z.literal("")),
  officeAddress: z.string().trim().max(300),

  // Step 3 -- Your Challenges
  challenges: z.array(z.enum(challengeOptions)),
  challengesOther: z.string().trim().max(300),

  // Step 4a -- Your Goals: which of the 4 service pillars fits (holds a pillar slug)
  goalsCategory: z.string(),
  // Step 4b -- Your Goals: which systems within that pillar
  goals: z.array(z.string()),

  // Step 5 -- Final Details
  budget: z
    .enum(budgetRanges)
    .or(z.literal(""))
    .refine((value) => value !== "", { message: "Select a budget range" }),
  timeline: z
    .enum(timelines)
    .or(z.literal(""))
    .refine((value) => value !== "", { message: "Select a timeline" }),
  referralSource: z.enum(referralSources).or(z.literal("")),
  notes: z.string().trim().max(5_000),
});

/** Plain object schema (unlike `contactSchema` below) -- supports `.pick()` for per-step validation. */
export { baseContactSchema };

/** Step schema for "Business Information" -- only shown when `buildingFor` is "An existing business", so every field here is unconditionally required within that step. */
export const businessInfoStepSchema = z
  .object({
    businessName: z.string().trim().min(1, "Business name is required").max(200),
    industry: z
      .enum(industries)
      .or(z.literal(""))
      .refine((value) => value !== "", { message: "Select an industry" }),
    industryOther: z.string().trim().max(120).default(""),
    position: z
      .enum(positions)
      .or(z.literal(""))
      .refine((value) => value !== "", { message: "Select your role" }),
    positionOther: z.string().trim().max(120).default(""),
    businessSize: z
      .enum(businessSizes)
      .or(z.literal(""))
      .refine((value) => value !== "", { message: "Select a business size" }),
    yearsOperating: z
      .enum(yearsOperating)
      .or(z.literal(""))
      .refine((value) => value !== "", {
        message: "Select how long you've been operating",
      }),
    officeAddress: z.string().trim().max(300).default(""),
  })
  .superRefine((data, ctx) => {
    if (data.industry === "Other" && !data.industryOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["industryOther"],
        message: "Specify your industry",
      });
    }
    if (data.position === "Other" && !data.positionOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["positionOther"],
        message: "Specify your role",
      });
    }
  });

/** Step schema for "Your Goals" (area pick) -- one of the 4 service pillars. */
export const goalsAreaStepSchema = z.object({
  goalsCategory: z.string().min(1, "Choose an area to continue"),
});

/** Step schema for "Your Goals" (systems pick) -- requires at least one, scoped to the chosen area. */
export const goalsSystemsStepSchema = z.object({
  goals: z.array(z.string()).min(1, "Pick at least one"),
});

export const contactSchema = baseContactSchema.superRefine((data, ctx) => {
  if (data.buildingFor === "An existing business") {
    if (!data.businessName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["businessName"],
        message: "Business name is required",
      });
    }
    if (!data.industry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["industry"],
        message: "Select an industry",
      });
    }
    if (data.industry === "Other" && !data.industryOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["industryOther"],
        message: "Specify your industry",
      });
    }
    if (!data.position) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["position"],
        message: "Select your role",
      });
    }
    if (data.position === "Other" && !data.positionOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["positionOther"],
        message: "Specify your role",
      });
    }
    if (!data.businessSize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["businessSize"],
        message: "Select a business size",
      });
    }
    if (!data.yearsOperating) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["yearsOperating"],
        message: "Select how long you've been operating",
      });
    }
  }

  if (!data.goalsCategory) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["goalsCategory"],
      message: "Choose an area to continue",
    });
  }

  if (data.goals.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["goals"],
      message: "Pick at least one",
    });
  }
});

export type ContactFormData = z.input<typeof baseContactSchema>;

export const contactFormDefaults: ContactFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  buildingFor: "",
  businessName: "",
  industry: "",
  industryOther: "",
  position: "",
  positionOther: "",
  businessSize: "",
  yearsOperating: "",
  officeAddress: "",
  challenges: [],
  challengesOther: "",
  goalsCategory: "",
  goals: [],
  budget: "",
  timeline: "",
  referralSource: "",
  notes: "",
};

export function buildHubSpotMessage(data: ContactFormData) {
  const goalsArea = getServicePillar(data.goalsCategory)?.title ?? data.goalsCategory;

  return [
    data.buildingFor && `This project is for: ${data.buildingFor}`,
    data.businessName && `Business: ${data.businessName}`,
    data.industry &&
      `Industry: ${data.industry === "Other" ? data.industryOther : data.industry}`,
    data.position &&
      `Role: ${data.position === "Other" ? data.positionOther : data.position}`,
    data.businessSize && `Business size: ${data.businessSize}`,
    data.yearsOperating && `Years operating: ${data.yearsOperating}`,
    data.officeAddress && `Office address: ${data.officeAddress}`,
    data.challenges.length > 0 && `Challenges: ${data.challenges.join("; ")}`,
    data.challengesOther && `Other challenge: ${data.challengesOther}`,
    goalsArea && `Goals area: ${goalsArea}`,
    data.goals.length > 0 && `Goals: ${data.goals.join("; ")}`,
    data.budget && `Budget: ${data.budget}`,
    data.timeline && `Timeline: ${data.timeline}`,
    data.referralSource && `Heard about us via: ${data.referralSource}`,
    "",
    data.notes,
  ]
    .filter(Boolean)
    .join("\n");
}
