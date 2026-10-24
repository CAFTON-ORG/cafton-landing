import "server-only";

import { cache } from "react";

import { siteDocuments, type SiteDocumentKey } from "../site/registry";
import { readSiteDocument } from "./site-content";

type DocumentOf<K extends SiteDocumentKey> = (typeof siteDocuments)[K]["defaults"];

/** One page of site content: the stored document, or the bundled one. One read per request. */
const readers = new Map<SiteDocumentKey, () => Promise<unknown>>();

export function getDocument<K extends SiteDocumentKey>(key: K): Promise<DocumentOf<K>> {
  let reader = readers.get(key);
  if (!reader) {
    const { schema, defaults } = siteDocuments[key];
    reader = cache(() => readSiteDocument(key, schema as never, defaults as never));
    readers.set(key, reader);
  }
  return reader() as Promise<DocumentOf<K>>;
}

export const getCareers = () => getDocument("careers");
