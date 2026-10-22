import type { z } from "zod";

import { careers } from "../content/careers";
import { careersSchema, careersSpec } from "./careers";
import {
  aboutDefaults,
  aboutSchema,
  aboutSpec,
  contactDefaults,
  contactSchema,
  contactSpec,
  homeDefaults,
  homeSchema,
  homeSpec,
} from "./pages";
import {
  legalDefaults,
  legalSchema,
  legalSpec,
  privacyDefaults,
  privacySchema,
  privacySpec,
} from "./policies";
import {
  servicesDefaults,
  servicesSchema,
  servicesSpec,
  valuesDefaults,
  valuesSchema,
  valuesSpec,
} from "./services";
import type { DocSpec } from "./spec";

/**
 * The editable pages of site content. Add a document here (bundled content, schema, form
 * spec) and it gets an editor under Pages, validation on save, and the same fallback rules
 * as everything else. Each page's public components read it through
 * `repository/documents.ts`.
 */
export interface SiteDocument<T = unknown> {
  schema: z.ZodType<T>;
  defaults: T;
  spec: DocSpec;
}

export const siteDocuments = {
  careers: { schema: careersSchema, defaults: careers, spec: careersSpec },
  services: { schema: servicesSchema, defaults: servicesDefaults, spec: servicesSpec },
  privacy: { schema: privacySchema, defaults: privacyDefaults, spec: privacySpec },
  legal: { schema: legalSchema, defaults: legalDefaults, spec: legalSpec },
  contact: { schema: contactSchema, defaults: contactDefaults, spec: contactSpec },
  about: { schema: aboutSchema, defaults: aboutDefaults, spec: aboutSpec },
  home: { schema: homeSchema, defaults: homeDefaults, spec: homeSpec },
  values: { schema: valuesSchema, defaults: valuesDefaults, spec: valuesSpec },
} satisfies Record<string, SiteDocument<never> | SiteDocument<unknown>>;

export type SiteDocumentKey = keyof typeof siteDocuments;

export const isSiteDocumentKey = (key: string): key is SiteDocumentKey => key in siteDocuments;
