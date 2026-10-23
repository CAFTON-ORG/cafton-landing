import "server-only";

import { cache } from "react";
import type { Metadata } from "next";

import { DEFAULT_SOCIAL_IMAGE } from "@/config/site";
import { pageMetadata } from "@/lib/seo";
import { seoOverrides, seoPages } from "../content/seo-pages";
import { seoDocumentSchema } from "../schemas";
import type { SeoDocument } from "../types";
import { getCareers } from "./documents";
import { getSiteSettings } from "./site";
import { readSiteDocument } from "./site-content";

/** What staff changed, per page. One read per request. */
export const getSeoOverrides = cache((): Promise<SeoDocument> =>
  readSiteDocument("seo", seoDocumentSchema, seoOverrides, { fill: false }),
);

/** A fixed page's search and share text: the defaults with staff changes on top. */
export async function resolveSeo(key: string) {
  const page = seoPages.find((entry) => entry.key === key);
  if (!page) throw new Error(`Unknown SEO page "${key}".`);
  const [{ pages }, settings] = await Promise.all([getSeoOverrides(), getSiteSettings()]);
  // The careers page has nothing worth indexing until there is a role to list.
  const defaultHidden =
    key === "careers" ? (await getCareers()).roles.length === 0 : (page.noindex ?? false);
  const override = pages[key] ?? {};
  const title = override.title || page.title;
  return {
    path: page.path,
    title,
    absoluteTitle: page.absoluteTitle,
    description: override.description || page.description || settings.description,
    noindex: override.noindex ?? defaultHidden,
    image: override.image ? { ...override.image, alt: title } : DEFAULT_SOCIAL_IMAGE,
  };
}

/** Metadata for a fixed page. */
export async function pageSeo(key: string): Promise<Metadata> {
  return pageMetadata(await resolveSeo(key));
}

/** Pages that search engines may index, for the sitemap. */
export async function indexedPagePaths(): Promise<string[]> {
  const resolved = await Promise.all(seoPages.map((page) => resolveSeo(page.key)));
  return resolved
    .filter((page) => !page.noindex)
    .map((page) => (page.path === "/" ? "" : page.path));
}
