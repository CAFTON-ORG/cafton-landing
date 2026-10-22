"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { withIcons } from "@/config/services";
import { withValueIcons } from "@/config/values";
import type {
  CoreValueContent,
  HomeContent,
  ServiceContent,
  SiteSettings,
} from "@/features/cms/types";

/** What the contact form needs to know about booking: whether to show the step, and its intro. */
export interface BookingSummary {
  enabled: boolean;
  intro: string;
}

interface SiteContent {
  settings: SiteSettings;
  services: ServiceContent[];
  values: CoreValueContent[];
  valuesHeader: { heading: string; intro: string };
  home: HomeContent;
  booking: BookingSummary;
}

const SiteContentContext = createContext<SiteContent | null>(null);

/**
 * Hands the (server-read) site content to client components, so they need no props drilled in.
 * Only plain data crosses over; the icons are attached on this side.
 */
export function SiteSettingsProvider({
  settings,
  services,
  values,
  valuesHeader,
  home,
  booking,
  children,
}: SiteContent & { children: ReactNode }) {
  const value = useMemo(
    () => ({ settings, services, values, valuesHeader, home, booking }),
    [settings, services, values, valuesHeader, home, booking],
  );
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

function useSiteContent(): SiteContent {
  const content = useContext(SiteContentContext);
  if (!content) throw new Error("Site content hooks must be used inside SiteSettingsProvider.");
  return content;
}

export const useSiteSettings = (): SiteSettings => useSiteContent().settings;

export function useServicePillars() {
  const { services } = useSiteContent();
  return useMemo(() => withIcons(services), [services]);
}

export function useServicePillar(slug: string) {
  return useServicePillars().find((pillar) => pillar.slug === slug);
}

export function useCoreValues() {
  const { values } = useSiteContent();
  return useMemo(() => withValueIcons(values), [values]);
}

export const useValuesHeader = () => useSiteContent().valuesHeader;

export const useHomeContent = () => useSiteContent().home;

export const useBooking = () => useSiteContent().booking;
