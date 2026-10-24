import { z } from "zod";

import type { DocSpec } from "./spec";

const line = (label: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, label + " can't be empty.")
    .max(max, "Keep it under " + max + " characters.");

export const careersSchema = z.object({
  eyebrow: line("The label", 40),
  heading: line("The headline", 120),
  intro: line("The introduction", 400),
  emptyTitle: line("The heading", 120),
  emptyText: line("The text", 400),
  buttonLabel: line("The button text", 40),
  roles: z
    .array(
      z.object({
        title: line("The role title", 120),
        type: line("The type", 40),
        location: line("The location", 80),
        summary: line("The description", 600),
      }),
    )
    .max(20),
});

export const careersSpec: DocSpec = {
  key: "careers",
  title: "Careers",
  description: "The careers page: its text and the open roles.",
  path: "/careers",
  sections: [
    {
      title: "Page text",
      fields: [
        { kind: "text", name: "eyebrow", label: "Small label" },
        { kind: "text", name: "heading", label: "Headline" },
        { kind: "textarea", name: "intro", label: "Introduction", rows: 3 },
      ],
    },
    {
      title: "Open roles",
      description:
        "When there is at least one role the page lists them and search engines may index it. With none, the page invites people to introduce themselves.",
      fields: [
        {
          kind: "list",
          name: "roles",
          label: "Roles",
          itemName: "Role",
          summary: "title",
          max: 20,
          fields: [
            { kind: "text", name: "title", label: "Role title" },
            { kind: "text", name: "type", label: "Type", placeholder: "Full-time" },
            {
              kind: "text",
              name: "location",
              label: "Location",
              placeholder: "Baguio City or remote",
            },
            { kind: "textarea", name: "summary", label: "Description", rows: 4 },
          ],
        },
        { kind: "text", name: "emptyTitle", label: "Heading when there are no roles" },
        { kind: "textarea", name: "emptyText", label: "Text under it", rows: 2 },
        {
          kind: "text",
          name: "buttonLabel",
          label: "Button text",
          hint: "Opens an email to the contact address.",
        },
      ],
    },
  ],
};
