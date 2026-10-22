"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { SiteSettings } from "@/features/cms/types";

const SiteSettingsContext = createContext<SiteSettings | null>(null);

/** Hands the (server-read) site settings to client components, so they need no props drilled in. */
export function SiteSettingsProvider({
  settings,
  children,
}: {
  settings: SiteSettings;
  children: ReactNode;
}) {
  return <SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings(): SiteSettings {
  const settings = useContext(SiteSettingsContext);
  if (!settings) throw new Error("useSiteSettings must be used inside SiteSettingsProvider.");
  return settings;
}
