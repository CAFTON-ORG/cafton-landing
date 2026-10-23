import type { z } from "zod";

import type { Permission } from "@/lib/auth/permissions";

import { careers } from "../content/careers";
import {
  listingsDefaults,
  listingsSchema,
  listingsSpec,
  partnerCopyDefaults,
  partnerCopySchema,
  partnerCopySpec,
} from "./listings";
import { bookingDefaults, bookingSchema, bookingSpec } from "./booking";
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
  /** Needed to save it. Defaults to `content:update`. */
  permission?: Permission;
  /** Not listed under Website > Pages: it has its own place in the dashboard. */
  hidden?: boolean;
  schema: z.ZodType<T>;
  defaults: T;
  spec: DocSpec;
}

export const siteDocuments = {
  booking: {
    permission: "meetings:update",
    hidden: true,
    schema: bookingSchema,
    defaults: bookingDefaults,
    spec: bookingSpec,
  },
  careers: { schema: careersSchema, defaults: careers, spec: careersSpec },
  services: { schema: servicesSchema, defaults: servicesDefaults, spec: servicesSpec },
  privacy: { schema: privacySchema, defaults: privacyDefaults, spec: privacySpec },
  legal: { schema: legalSchema, defaults: legalDefaults, spec: legalSpec },
  contact: { schema: contactSchema, defaults: contactDefaults, spec: contactSpec },
  about: { schema: aboutSchema, defaults: aboutDefaults, spec: aboutSpec },
  home: { schema: homeSchema, defaults: homeDefaults, spec: homeSpec },
  listings: { schema: listingsSchema, defaults: listingsDefaults, spec: listingsSpec },
  partnerCopy: { schema: partnerCopySchema, defaults: partnerCopyDefaults, spec: partnerCopySpec },
  values: { schema: valuesSchema, defaults: valuesDefaults, spec: valuesSpec },
} satisfies Record<string, SiteDocument<never> | SiteDocument<unknown>>;

export type SiteDocumentKey = keyof typeof siteDocuments;

export const isSiteDocumentKey = (key: string): key is SiteDocumentKey => key in siteDocuments;
