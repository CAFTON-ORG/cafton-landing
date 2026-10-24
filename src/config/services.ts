import { Building2, Cog, Rocket, TrendingUp, type LucideIcon } from "lucide-react";

import { serviceContent } from "@/features/cms/content/services";
import type { ServiceContent } from "@/features/cms/types/core";

export interface ServiceSystem {
  title: string;
  description: string;
}

export interface ServicePillar extends ServiceContent {
  icon: LucideIcon;
}

/**
 * The four service areas. Their web addresses (slugs) and icons are fixed in code;
 * the wording comes from the dashboard (`features/cms/repository/services.ts`) and falls
 * back to the bundled text in `features/cms/content/services.ts`.
 */
const ICONS: Record<string, LucideIcon> = {
  operations: Cog,
  growth: TrendingUp,
  "industry-platforms": Building2,
  "product-builds": Rocket,
};

/** Adds each area's icon to its wording. */
export function withIcons(content: ServiceContent[]): ServicePillar[] {
  return content.map((entry) => ({ ...entry, icon: ICONS[entry.slug] ?? Cog }));
}

/** The bundled wording: the slugs that exist, and what shows when nothing has been edited. */
export const servicePillars: ServicePillar[] = withIcons(serviceContent);

export function getServicePillar(slug: string) {
  return servicePillars.find((pillar) => pillar.slug === slug);
}
