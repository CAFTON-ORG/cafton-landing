import "server-only";

import { cache } from "react";

import { siteSettings } from "../content/site-settings";
import { siteSettingsSchema } from "../schemas/core";
import type { SiteSettings } from "../types/core";
import { readSiteDocument } from "./site-content";

/** Company facts, contact details and social links. One read per request, however many components ask. */
export const getSiteSettings = cache((): Promise<SiteSettings> =>
  readSiteDocument("settings", siteSettingsSchema, siteSettings),
);
