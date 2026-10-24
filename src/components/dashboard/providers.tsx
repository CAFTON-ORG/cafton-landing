import type { ReactNode } from "react";

import { Toaster } from "@/components/dashboard/ui/sonner";
import { ThemeProvider } from "@/providers/theme-provider";
import { THEME_STORAGE_KEY } from "@/config/site";

/**
 * Theme and toasts for the non-public surfaces (sign-in and the dashboard).
 * Shares the public site's theme key, so one light/dark choice follows the
 * person everywhere.
 */
export function DashboardProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark" storageKey={THEME_STORAGE_KEY}>
      {children}
      <Toaster richColors closeButton />
    </ThemeProvider>
  );
}
