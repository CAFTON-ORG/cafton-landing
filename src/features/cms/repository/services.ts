import "server-only";

import { cache } from "react";

import { withIcons, type ServicePillar } from "@/config/services";
import { withValueIcons, type CoreValue } from "@/config/values";
import { getDocument } from "./documents";

/** The service areas with their wording from the dashboard, plus each one's icon. */
export const getServices = cache(async (): Promise<ServicePillar[]> =>
  withIcons((await getDocument("services")).pillars),
);

export async function getService(slug: string): Promise<ServicePillar | undefined> {
  return (await getServices()).find((pillar) => pillar.slug === slug);
}

/** The core values with their icons. */
export const getCoreValues = cache(async (): Promise<CoreValue[]> =>
  withValueIcons((await getDocument("values")).items),
);

/** The heading and introduction around the values. */
export const getValuesHeader = cache(async () => {
  const { heading, intro } = await getDocument("values");
  return { heading, intro };
});
