import { partners } from "@/features/cms/content/partners";
import type { Partner } from "@/features/cms/types";

/**
 * Data access for partners and sponsors. These are async on purpose: every page already
 * `await`s them, so moving the content from `features/cms/content` to a backend means
 * changing only the bodies here, not the pages or components that use them.
 */

export async function listPartners(): Promise<Partner[]> {
  return partners;
}
