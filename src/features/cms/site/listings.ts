import { z } from "zod";

import { listings, partnerCopy } from "../content/listings";
import type { DocSpec, FieldSpec } from "./spec";

const line = (label: string, max: number) =>
  z.string().trim().min(1, `${label} can't be empty.`).max(max, `Keep it under ${max} characters.`);

const header = {
  eyebrow: line("The label", 40),
  heading: line("The headline", 140),
  intro: line("The introduction", 400),
};

const headerFields: FieldSpec[] = [
  { kind: "text", name: "eyebrow", label: "Small label" },
  { kind: "text", name: "heading", label: "Headline" },
  { kind: "textarea", name: "intro", label: "Introduction", rows: 3 },
];

/* ----------------------------------------------------------------- listings */

export const listingsSchema = z.object({
  blog: z.object({ ...header, empty: line("The message", 140) }),
  portfolio: z.object({ ...header, empty: line("The message", 140) }),
  events: z.object({
    ...header,
    openHeading: line("The heading", 60),
    pastHeading: line("The heading", 60),
    moreHeading: line("The heading", 60),
    moreText: line("The message", 300),
  }),
});

export const listingsSpec: DocSpec = {
  key: "listings",
  title: "Blog, portfolio and events pages",
  description: "The heading text at the top of the three list pages, and their empty messages.",
  path: "/blog",
  sections: [
    {
      title: "Blog",
      fields: [
        {
          kind: "group",
          name: "blog",
          label: "Blog page",
          fields: [
            ...headerFields,
            { kind: "text", name: "empty", label: "When a category has no posts" },
          ],
        },
      ],
    },
    {
      title: "Portfolio",
      fields: [
        {
          kind: "group",
          name: "portfolio",
          label: "Portfolio page",
          fields: [
            ...headerFields,
            { kind: "text", name: "empty", label: "When a category has no projects" },
          ],
        },
      ],
    },
    {
      title: "Events",
      fields: [
        {
          kind: "group",
          name: "events",
          label: "Events page",
          fields: [
            ...headerFields,
            { kind: "text", name: "openHeading", label: "Heading of open and upcoming events" },
            { kind: "text", name: "pastHeading", label: "Heading of past events" },
            { kind: "text", name: "moreHeading", label: "Heading when there is nothing else" },
            {
              kind: "textarea",
              name: "moreText",
              label: "Message when there is nothing else",
              rows: 2,
            },
          ],
        },
      ],
    },
  ],
};

export const listingsDefaults = listings;

/* ------------------------------------------------------------ partner wording */

export const partnerCopySchema = z.object({
  section: z.object({
    eyebrow: line("The label", 40),
    heading: line("The headline", 140),
    text: line("The text", 400),
    allLabel: line("The label", 40),
    askText: line("The text", 300),
    askLabel: line("The link text", 40),
  }),
  strip: z.object({
    eyebrow: line("The label", 40),
    heading: line("The headline", 140),
    text: line("The text", 300),
    linkLabel: line("The link text", 40),
  }),
});

export const partnerCopySpec: DocSpec = {
  key: "partnerCopy",
  title: "Partners wording",
  description: "The text around the partner logos. The partners themselves are under Partners.",
  path: "/about#partners",
  sections: [
    {
      title: "About page",
      fields: [
        {
          kind: "group",
          name: "section",
          label: "Partners section",
          fields: [
            { kind: "text", name: "eyebrow", label: "Small label" },
            { kind: "text", name: "heading", label: "Headline" },
            { kind: "textarea", name: "text", label: "Text", rows: 3 },
            { kind: "text", name: "allLabel", label: "Label above the smaller logos" },
            { kind: "textarea", name: "askText", label: "Invitation", rows: 2 },
            { kind: "text", name: "askLabel", label: "Invitation link text" },
          ],
        },
      ],
    },
    {
      title: "Home page",
      fields: [
        {
          kind: "group",
          name: "strip",
          label: "Partners band",
          fields: [
            { kind: "text", name: "eyebrow", label: "Small label" },
            { kind: "text", name: "heading", label: "Headline" },
            { kind: "textarea", name: "text", label: "Text", rows: 2 },
            { kind: "text", name: "linkLabel", label: "Link text" },
          ],
        },
      ],
    },
  ],
};

export const partnerCopyDefaults = partnerCopy;
