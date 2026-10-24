import { z } from "zod";

import { serviceContent, servicesPage } from "../content/services";
import { coreValueContent, valuesDocument } from "../content/values";
import { isSafeImageSrc } from "../rules/core";
import { VALUE_ICON_NAMES } from "../types/core";
import type { DocSpec } from "./spec";

const line = (label: string, max: number) =>
  z.string().trim().min(1, `${label} can't be empty.`).max(max, `Keep it under ${max} characters.`);

/** The slugs are the web addresses of the service pages: fixed in code, so a pillar can only be edited. */
const SLUGS = serviceContent.map((entry) => entry.slug);

export const servicesSchema = z.object({
  eyebrow: line("The label", 40),
  heading: line("The headline", 140),
  intro: line("The introduction", 400),
  detail: z.object({
    navTagline: line("The line", 140),
    navLinkLabel: line("The link text", 40),
    talkLabel: line("The button text", 60),
    systemsEyebrow: line("The label", 40),
    systemsHeading: line("The heading", 140),
    systemsHint: line("The text", 300),
    faqEyebrow: line("The label", 40),
    faqHeading: line("The heading", 100),
    relatedHeading: line("The heading", 60),
  }),
  pillars: z
    .array(
      z.object({
        slug: z.enum(SLUGS as [string, ...string[]]),
        title: line("The name", 80),
        tagline: line("The short line", 140),
        summary: line("The description", 600),
        image: z
          .string()
          .refine(
            (value) => value === "" || isSafeImageSrc(value),
            "Use an uploaded image or an https address.",
          )
          .optional(),
        imageAlt: z.string().trim().max(200).optional(),
        systems: z
          .array(
            z.object({
              title: line("The system name", 80),
              description: line("The description", 300),
            }),
          )
          .min(1, "Keep at least one system.")
          .max(12),
      }),
    )
    .length(SLUGS.length, "All service areas are needed.")
    .refine(
      (pillars) => new Set(pillars.map((pillar) => pillar.slug)).size === pillars.length,
      "Each service area can appear once.",
    ),
});

export const servicesSpec: DocSpec = {
  key: "services",
  title: "Services",
  description: "The four service areas and the systems listed under each.",
  path: "/services",
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
      title: "Service pages",
      description: "The wording shared by the Services menu and every area's own page.",
      fields: [
        {
          kind: "group",
          name: "detail",
          label: "Menu and area pages",
          fields: [
            { kind: "text", name: "navTagline", label: "Line in the Services menu" },
            { kind: "text", name: "navLinkLabel", label: "Link in the Services menu" },
            { kind: "text", name: "talkLabel", label: "Button on an area's page" },
            { kind: "text", name: "systemsEyebrow", label: "Small label above the systems" },
            {
              kind: "text",
              name: "systemsHeading",
              label: "Heading above the systems",
              hint: "Write {count} where the number of systems should appear.",
            },
            { kind: "textarea", name: "systemsHint", label: "Text under the heading", rows: 2 },
            { kind: "text", name: "faqEyebrow", label: "Small label above the questions" },
            { kind: "text", name: "faqHeading", label: "Heading above the questions" },
            { kind: "text", name: "relatedHeading", label: "Heading above related work" },
          ],
        },
      ],
    },
    {
      title: "Service areas",
      description:
        "Their web addresses are fixed. You can change the wording, the order and the systems under each.",
      fields: [
        {
          kind: "list",
          name: "pillars",
          label: "Areas",
          itemName: "Area",
          summary: "title",
          fixed: true,
          fields: [
            {
              kind: "text",
              name: "slug",
              label: "Web address",
              readonly: true,
              hint: "cafton.com/services/…  Fixed.",
            },
            { kind: "text", name: "title", label: "Name" },
            {
              kind: "text",
              name: "tagline",
              label: "Short line",
              hint: "Shown on cards and menus.",
            },
            {
              kind: "textarea",
              name: "summary",
              label: "Description",
              rows: 4,
              hint: "Shown on the area's own page.",
            },
            {
              kind: "image",
              name: "image",
              label: "Image (optional)",
              hint: "Shown instead of the drawn illustration, on the Services page and on the area's own page.",
              aspect: "aspect-4/3",
            },
            {
              kind: "text",
              name: "imageAlt",
              label: "Describe the image",
              hint: "Needed when there is an image: screen readers read it.",
            },
            {
              kind: "list",
              name: "systems",
              label: "Systems",
              itemName: "System",
              summary: "title",
              max: 12,
              fields: [
                { kind: "text", name: "title", label: "Name" },
                { kind: "textarea", name: "description", label: "Description", rows: 2 },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const servicesDefaults = { ...servicesPage, pillars: serviceContent };

/* ------------------------------------------------------------------- values */

export const valuesSchema = z.object({
  heading: line("The heading", 80),
  intro: line("The introduction", 200),
  items: z
    .array(
      z.object({
        icon: z.enum(VALUE_ICON_NAMES),
        title: line("The name", 60),
        description: line("The description", 300),
      }),
    )
    .length(
      coreValueContent.length,
      `There are exactly ${coreValueContent.length} values: the home page scroll is built around that number.`,
    ),
});

export const valuesSpec: DocSpec = {
  key: "values",
  title: "Core values",
  description: "Shown on the About page and in the home page scroll.",
  path: "/about",
  sections: [
    {
      title: "Values",
      description:
        "The home page scroll is built for exactly this many, so they can be edited and reordered but not added or removed.",
      fields: [
        { kind: "text", name: "heading", label: "Heading" },
        { kind: "textarea", name: "intro", label: "Introduction", rows: 2 },
        {
          kind: "list",
          name: "items",
          label: "Values",
          itemName: "Value",
          summary: "title",
          fixed: true,
          fields: [
            {
              kind: "select",
              name: "icon",
              label: "Icon",
              options: [
                { value: "lightbulb", label: "Light bulb" },
                { value: "shield-check", label: "Shield" },
                { value: "users", label: "People" },
                { value: "badge-check", label: "Badge" },
                { value: "refresh", label: "Cycle" },
                { value: "handshake", label: "Handshake" },
              ],
            },
            { kind: "text", name: "title", label: "Name" },
            { kind: "textarea", name: "description", label: "Description", rows: 3 },
          ],
        },
      ],
    },
  ],
};

export const valuesDefaults = valuesDocument;
