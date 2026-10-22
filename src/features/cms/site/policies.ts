import { z } from "zod";

import { legal } from "../content/legal";
import { privacyPolicy } from "../content/privacy-policy";
import { isSafeImageSrc } from "../rules";
import type { DocSpec, FieldSpec } from "./spec";

const line = (label: string, max: number) =>
  z.string().trim().min(1, `${label} can't be empty.`).max(max, `Keep it under ${max} characters.`);

const sectionSchema = z.object({
  /** Optional web anchor, e.g. "cookies". Empty uses the title. */
  id: z
    .string()
    .trim()
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Lower-case letters, numbers and dashes only.")
    .max(60),
  title: line("The section title", 100),
  body: line("The text", 8000),
});

const sections = z.array(sectionSchema).min(1, "Keep at least one section.").max(30);

export const privacySchema = z.object({
  eyebrow: line("The label", 40),
  heading: line("The headline", 120),
  intro: line("The introduction", 400),
  lastUpdated: line("The date", 40),
  sections,
});

export const legalSchema = z.object({
  eyebrow: line("The label", 40),
  heading: line("The headline", 120),
  registrations: z
    .array(
      z.object({
        name: line("The name", 120),
        status: line("The status", 60),
        detail: line("The details", 160),
        image: z
          .string()
          .refine(
            (value) => value === "" || isSafeImageSrc(value),
            "Use an uploaded image or an https address.",
          ),
        imageAlt: z.string().trim().max(200),
      }),
    )
    .max(10),
  sections,
});

const FORMAT_HINT =
  "Blank line between paragraphs. Start a line with - for a bullet. **bold**, [link text](https://address) or (/page). {{email}}, {{city}} and {{country}} insert the website settings.";

const sectionFields = (extraHint = ""): FieldSpec[] => [
  {
    kind: "list",
    name: "sections",
    label: "Sections",
    itemName: "Section",
    summary: "title",
    max: 30,
    hint: "They appear in this order, with a table of contents beside them.",
    fields: [
      { kind: "text", name: "title", label: "Title" },
      {
        kind: "text",
        name: "id",
        label: "Web anchor (optional)",
        hint: "Only if another page links straight to this section. Leave empty otherwise.",
      },
      {
        kind: "textarea",
        name: "body",
        label: "Text",
        rows: 10,
        hint: `${FORMAT_HINT}${extraHint}`,
      },
    ],
  },
];

export const privacySpec: DocSpec = {
  key: "privacy",
  title: "Privacy policy",
  description: "The privacy policy page. Changing it is a legal act: have it reviewed.",
  path: "/privacy",
  sections: [
    {
      title: "Page",
      fields: [
        { kind: "text", name: "eyebrow", label: "Small label" },
        { kind: "text", name: "heading", label: "Headline" },
        { kind: "textarea", name: "intro", label: "Introduction", rows: 2 },
        {
          kind: "text",
          name: "lastUpdated",
          label: "Last updated",
          hint: "Shown after the introduction. Change it whenever the policy changes.",
        },
      ],
    },
    {
      title: "Sections",
      fields: sectionFields(
        " {{cookie-table}} on its own line shows the cookie table; {{cookie-settings}} is the link to change the cookie choice.",
      ),
    },
  ],
};

export const legalSpec: DocSpec = {
  key: "legal",
  title: "Legal information",
  description: "Company registration details and the terms of use.",
  path: "/legal",
  sections: [
    {
      title: "Page",
      fields: [
        { kind: "text", name: "eyebrow", label: "Small label" },
        { kind: "text", name: "heading", label: "Headline" },
      ],
    },
    {
      title: "Registrations",
      description: "Shown as cards where {{registrations}} appears in a section's text.",
      fields: [
        {
          kind: "list",
          name: "registrations",
          label: "Registrations",
          itemName: "Registration",
          summary: "name",
          max: 10,
          fields: [
            { kind: "text", name: "name", label: "Name" },
            { kind: "text", name: "status", label: "Status", placeholder: "Registered" },
            { kind: "text", name: "detail", label: "Number and date" },
            {
              kind: "image",
              name: "image",
              label: "Seal or badge (optional)",
              aspect: "aspect-3/1",
            },
            { kind: "text", name: "imageAlt", label: "Describe the image" },
          ],
        },
      ],
    },
    {
      title: "Sections",
      fields: sectionFields(" {{registrations}} on its own line shows the registration cards."),
    },
  ],
};

export const privacyDefaults = privacyPolicy;
export const legalDefaults = legal;
