import { z } from "zod";

import { about } from "../content/about";
import { contact } from "../content/contact";
import { home } from "../content/home";
import { isSafeImageSrc } from "../rules";
import type { DocSpec } from "./spec";

const line = (label: string, max: number) =>
  z.string().trim().min(1, `${label} can't be empty.`).max(max, `Keep it under ${max} characters.`);

const imageSrc = z.string().refine(isSafeImageSrc, "Use an uploaded image or an https address.");

/* -------------------------------------------------------------------- about */

const titled = z.object({ label: line("The label", 60), text: line("The text", 600) });
const highlight = z.object({
  initial: z.string().trim().min(1, "Enter one letter.").max(2, "One or two letters."),
  label: line("The label", 40),
  text: line("The text", 800),
});

export const aboutSchema = z.object({
  hero: z.object({
    eyebrow: line("The label", 40),
    headlineStart: line("The first part of the headline", 100),
    headlineEmphasis: line("The underlined word", 40),
    headlineEnd: line("The end of the headline", 100),
    intro: line("The introduction", 500),
    photo: imageSrc,
    photoAlt: line("The description", 200),
  }),
  whatWeDo: z.object({
    eyebrow: line("The label", 40),
    heading: line("The heading", 140),
    paragraphs: z.array(line("A paragraph", 600)).min(1).max(4),
    specialties: z.array(line("A specialty", 80)).min(1).max(8),
  }),
  story: z.object({
    eyebrow: line("The label", 40),
    heading: line("The heading", 100),
    nameCaption: line("The note under the name", 300),
    chapters: z.array(titled).min(1).max(8),
  }),
  vision: z.object({
    eyebrow: line("The label", 40),
    statement: line("The vision", 500),
    mission: highlight,
    goal: highlight,
  }),
  approach: z.object({
    eyebrow: line("The label", 40),
    heading: line("The heading", 100),
    intro: line("The introduction", 400),
  }),
  help: z.object({
    heading: line("The heading", 100),
    intro: line("The introduction", 300),
    linkLabel: line("The link text", 40),
  }),
});

export const aboutSpec: DocSpec = {
  key: "about",
  title: "About page",
  description: "The story, mission and approach on the About page.",
  path: "/about",
  sections: [
    {
      title: "Top",
      fields: [
        {
          kind: "group",
          name: "hero",
          label: "Headline and photo",
          fields: [
            { kind: "text", name: "eyebrow", label: "Small label" },
            { kind: "text", name: "headlineStart", label: "Headline: start" },
            { kind: "text", name: "headlineEmphasis", label: "Headline: underlined word" },
            { kind: "text", name: "headlineEnd", label: "Headline: end" },
            { kind: "textarea", name: "intro", label: "Introduction", rows: 4 },
            { kind: "image", name: "photo", label: "Team photo", aspect: "aspect-4/3" },
            { kind: "text", name: "photoAlt", label: "Describe the photo" },
          ],
        },
      ],
    },
    {
      title: "What we do",
      fields: [
        {
          kind: "group",
          name: "whatWeDo",
          label: "What we do",
          fields: [
            { kind: "text", name: "eyebrow", label: "Small label" },
            { kind: "text", name: "heading", label: "Heading" },
            {
              kind: "lines",
              name: "paragraphs",
              label: "Paragraphs",
              rows: 8,
              hint: "One paragraph per row.",
            },
            {
              kind: "lines",
              name: "specialties",
              label: "Specialties",
              rows: 5,
              hint: "One per row, shown as a numbered list.",
            },
          ],
        },
      ],
    },
    {
      title: "Story",
      fields: [
        {
          kind: "group",
          name: "story",
          label: "Our story",
          fields: [
            { kind: "text", name: "eyebrow", label: "Small label" },
            { kind: "text", name: "heading", label: "Heading" },
            {
              kind: "textarea",
              name: "nameCaption",
              label: "Note under the CAF + TON mark",
              rows: 3,
            },
            {
              kind: "list",
              name: "chapters",
              label: "Timeline",
              itemName: "Chapter",
              summary: "label",
              max: 8,
              fields: [
                { kind: "text", name: "label", label: "Label" },
                { kind: "textarea", name: "text", label: "Text", rows: 3 },
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Vision",
      fields: [
        {
          kind: "group",
          name: "vision",
          label: "Vision, mission and goal",
          fields: [
            { kind: "text", name: "eyebrow", label: "Small label" },
            { kind: "textarea", name: "statement", label: "Vision", rows: 4 },
            {
              kind: "group",
              name: "mission",
              label: "Mission",
              fields: [
                { kind: "text", name: "initial", label: "Big letter" },
                { kind: "text", name: "label", label: "Label" },
                { kind: "textarea", name: "text", label: "Text", rows: 4 },
              ],
            },
            {
              kind: "group",
              name: "goal",
              label: "Goal",
              fields: [
                { kind: "text", name: "initial", label: "Big letter" },
                { kind: "text", name: "label", label: "Label" },
                { kind: "textarea", name: "text", label: "Text", rows: 4 },
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Approach and services",
      fields: [
        {
          kind: "group",
          name: "approach",
          label: "How we work",
          fields: [
            { kind: "text", name: "eyebrow", label: "Small label" },
            { kind: "text", name: "heading", label: "Heading" },
            { kind: "textarea", name: "intro", label: "Introduction", rows: 3 },
          ],
        },
        {
          kind: "group",
          name: "help",
          label: "Where we can help",
          hint: "The four areas themselves are edited under Services.",
          fields: [
            { kind: "text", name: "heading", label: "Heading" },
            { kind: "textarea", name: "intro", label: "Introduction", rows: 2 },
            { kind: "text", name: "linkLabel", label: "Link text" },
          ],
        },
      ],
    },
  ],
};

export const aboutDefaults = about;

/* --------------------------------------------------------------------- home */

export const homeSchema = z.object({
  heroEyebrow: line("The line", 80),
  hero: z.object({
    first: z.object({ lead: line("The word", 30), accent: line("The accented word", 30) }),
    second: z.object({ lead: line("The word", 30), accent: line("The accented word", 30) }),
    text: line("The text", 200),
    contactLabel: line("The button text", 30),
    workLabel: line("The button text", 30),
    hint: line("The hint", 60),
  }),
  services: z.object({
    heading: line("The heading", 80),
    intro: line("The introduction", 300),
    linkLabel: line("The link text", 40),
  }),
  work: z.object({
    heading: line("The heading", 80),
    intro: line("The introduction", 300),
    buttonLabel: line("The button text", 40),
  }),
  writing: z.object({
    heading: line("The heading", 80),
    intro: line("The introduction", 300),
    buttonLabel: line("The button text", 40),
  }),
  cta: z.object({
    eyebrow: line("The label", 40),
    heading: line("The heading", 100),
    text: line("The text", 300),
    contactLabel: line("The button text", 40),
    bookLabel: line("The button text", 40),
  }),
});

export const homeSpec: DocSpec = {
  key: "home",
  title: "Home page",
  description: "The headings and short texts of the home page sections.",
  path: "/",
  sections: [
    {
      title: "Sections",
      description:
        "The footer slogan and the badges come from the website settings; the values come from Core values.",
      fields: [
        { kind: "text", name: "heroEyebrow", label: "Line above the headline" },
        {
          kind: "group",
          name: "hero",
          label: "Top of the page",
          hint: "The headline has two lines. On a wide screen the second word of each line drops below the first.",
          fields: [
            {
              kind: "group",
              name: "first",
              label: "Headline, first line",
              fields: [
                { kind: "text", name: "lead", label: "First word" },
                { kind: "text", name: "accent", label: "Second word" },
              ],
            },
            {
              kind: "group",
              name: "second",
              label: "Headline, second line",
              fields: [
                { kind: "text", name: "lead", label: "First word" },
                { kind: "text", name: "accent", label: "Second word (shown in colour)" },
              ],
            },
            { kind: "textarea", name: "text", label: "Short description", rows: 2 },
            { kind: "text", name: "contactLabel", label: "Contact button" },
            { kind: "text", name: "workLabel", label: "Work button" },
            {
              kind: "text",
              name: "hint",
              label: "Hint under the mark",
              hint: "Follows Click (or Tap on a phone).",
            },
          ],
        },
        {
          kind: "group",
          name: "services",
          label: "What we build",
          fields: [
            { kind: "text", name: "heading", label: "Heading" },
            { kind: "textarea", name: "intro", label: "Introduction", rows: 2 },
            { kind: "text", name: "linkLabel", label: "Link text" },
          ],
        },
        {
          kind: "group",
          name: "work",
          label: "Featured work",
          fields: [
            { kind: "text", name: "heading", label: "Heading" },
            { kind: "textarea", name: "intro", label: "Introduction", rows: 2 },
            { kind: "text", name: "buttonLabel", label: "Button text" },
          ],
        },
        {
          kind: "group",
          name: "writing",
          label: "Latest from the blog",
          fields: [
            { kind: "text", name: "heading", label: "Heading" },
            { kind: "textarea", name: "intro", label: "Introduction", rows: 2 },
            { kind: "text", name: "buttonLabel", label: "Button text" },
          ],
        },
        {
          kind: "group",
          name: "cta",
          label: "Call to action (also at the bottom of other pages)",
          fields: [
            { kind: "text", name: "eyebrow", label: "Small label" },
            { kind: "text", name: "heading", label: "Heading" },
            { kind: "textarea", name: "text", label: "Text", rows: 3 },
            { kind: "text", name: "contactLabel", label: "Contact button" },
            { kind: "text", name: "bookLabel", label: "Booking button" },
          ],
        },
      ],
    },
  ],
};

export const homeDefaults = home;

/* ------------------------------------------------------------------ contact */

export const contactSchema = z.object({
  eyebrow: line("The label", 40),
  heading: line("The headline", 120),
  intro: line("The introduction", 300),
  email: z.object({
    heading: line("The heading", 80),
    text: line("The text", 300),
    buttonLabel: line("The button text", 40),
  }),
  expect: z.object({
    heading: line("The heading", 80),
    text: line("The text", 200),
    note: line("The note", 300),
  }),
  faqHeading: line("The heading", 120),
});

export const contactSpec: DocSpec = {
  key: "contact",
  title: "Contact page",
  description: "The wording around the contact form.",
  path: "/contact",
  sections: [
    {
      title: "Page text",
      description:
        "The form's questions and the frequently asked questions are built into the page. The email address comes from the website settings.",
      fields: [
        { kind: "text", name: "eyebrow", label: "Small label" },
        { kind: "text", name: "heading", label: "Headline" },
        { kind: "textarea", name: "intro", label: "Introduction", rows: 2 },
        {
          kind: "group",
          name: "email",
          label: "Email us directly",
          fields: [
            { kind: "text", name: "heading", label: "Heading" },
            { kind: "textarea", name: "text", label: "Text", rows: 2 },
            { kind: "text", name: "buttonLabel", label: "Button text" },
          ],
        },
        {
          kind: "group",
          name: "expect",
          label: "What to expect",
          fields: [
            { kind: "text", name: "heading", label: "Heading" },
            { kind: "text", name: "text", label: "Text" },
            { kind: "textarea", name: "note", label: "Smaller note", rows: 2 },
          ],
        },
        { kind: "text", name: "faqHeading", label: "Heading above the questions" },
      ],
    },
  ],
};

export const contactDefaults = contact;
