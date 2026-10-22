import {
  BadgeCheck,
  Handshake,
  Lightbulb,
  RefreshCw,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { coreValueContent } from "@/features/cms/content/values";
import type { CoreValueContent, ValueIcon } from "@/features/cms/types";

export interface CoreValue {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** The icons a value can use. Staff pick a name; the drawing lives here. */
export const VALUE_ICONS: Record<ValueIcon, LucideIcon> = {
  lightbulb: Lightbulb,
  "shield-check": ShieldCheck,
  users: Users,
  "badge-check": BadgeCheck,
  refresh: RefreshCw,
  handshake: Handshake,
};

export function withValueIcons(content: CoreValueContent[]): CoreValue[] {
  return content.map((entry) => ({ ...entry, icon: VALUE_ICONS[entry.icon] }));
}

/** The bundled values. One source for the About page and the home page's "Why Cafton" scroll, so they always say the same thing. */
export const coreValues: CoreValue[] = withValueIcons(coreValueContent);
