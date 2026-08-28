import { z } from "zod";

export const projectTypes = [
  "Custom Software",
  "Web Application",
  "Mobile Application",
  "SaaS / Product",
  "System Modernization",
  "Partnership",
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

export const contactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email")
    .max(254),
  phone: z.string().trim().max(50),
  organization: z.string().trim().max(200),
  projectType: z.enum(projectTypes),
  project: z
    .string()
    .trim()
    .min(1, "Tell us a bit about your project")
    .max(5_000),
  // The type stays `<option> | ""` so an unselected dropdown (the
  // default state) is representable at all, but `.refine` rejects that
  // empty state at validation time -- both are now required.
  budget: z
    .enum(budgetRanges)
    .or(z.literal(""))
    .refine((value) => value !== "", { message: "Select a budget range" }),
  timeline: z
    .enum(timelines)
    .or(z.literal(""))
    .refine((value) => value !== "", { message: "Select a timeline" }),
});

// `z.input`, not `z.output`/`z.infer`: the budget/timeline refinements
// below narrow their *output* type to exclude "" (a real improvement --
// a successful parse now genuinely guarantees a selection was made), but
// the form's own state needs "" representable as the pre-selection
// default, which only the input type still allows.
export type ContactFormData = z.input<typeof contactSchema>;

export const contactFormDefaults: ContactFormData = {
  firstName: "",
  lastName: "",
  organization: "",
  email: "",
  phone: "",
  projectType: "Custom Software",
  project: "",
  budget: "",
  timeline: "",
};

export function buildHubSpotMessage(data: ContactFormData) {
  return [
    data.organization && `Organization: ${data.organization}`,
    `Project type: ${data.projectType}`,
    data.budget && `Budget: ${data.budget}`,
    data.timeline && `Timeline: ${data.timeline}`,
    "",
    data.project,
  ]
    .filter(Boolean)
    .join("\n");
}
