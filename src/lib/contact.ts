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
  budget: z.string().trim().max(100),
  timeline: z.string().trim().max(100),
});

export type ContactFormData = z.infer<typeof contactSchema>;

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
