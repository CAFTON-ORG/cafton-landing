import { events } from "@/features/cms/content/events";
import type { CaftonEvent } from "@/features/cms/types";

/**
 * Data access for events. These are async on purpose: every page already
 * `await`s them, so moving the content from `features/cms/content` to a backend means
 * changing only the bodies here, not the pages or components that use them.
 */

export async function listEvents(): Promise<CaftonEvent[]> {
  return events;
}

export async function getEvent(slug: string): Promise<CaftonEvent | undefined> {
  return events.find((event) => event.slug === slug);
}
