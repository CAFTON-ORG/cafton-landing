import type { ReactNode } from "react";

import { ConsentProvider } from "@/providers/consent-provider";
import { Footer } from "@/components/marketing/layout/footer";
import { Navbar } from "@/components/marketing/layout/navbar";
import { RevealObserver } from "@/components/marketing/motion/reveal-observer";
import { SiteLoader } from "@/components/marketing/motion/site-loader";
import { SmoothScroll } from "@/providers/smooth-scroll";
import { JsonLd } from "@/components/shared/json-ld";
import { ThemeProvider } from "@/providers/theme-provider";
import { THEME_STORAGE_KEY } from "@/config/site";
import { siteJsonLd } from "@/lib/structured-data";
import { getDocument } from "@/features/cms/repository/documents";
import { getSiteSettings } from "@/features/cms/repository/site";
import { SiteSettingsProvider } from "@/providers/site-settings";

/**
 * Everything the public website wraps its pages in: loader, theme, cookie
 * consent, smooth scroll, navbar and footer. The root layout stays bare so the
 * dashboard can share the document without any of this. Used by the (marketing)
 * layout and by the root 404.
 */
export async function SiteChrome({ children }: { children: ReactNode }) {
  const [settings, services, values, home, booking] = await Promise.all([
    getSiteSettings(),
    getDocument("services"),
    getDocument("values"),
    getDocument("home"),
    getDocument("booking"),
  ]);
  return (
    <SiteSettingsProvider
      settings={settings}
      services={services.pillars}
      values={values.items}
      valuesHeader={{ heading: values.heading, intro: values.intro }}
      home={home}
      servicesDetail={services.detail}
      booking={{ enabled: booking.enabled, intro: booking.intro }}
    >
      <a
        href="#main"
        className="sr-only fixed left-3 top-3 z-110 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background focus:not-sr-only focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        Skip to content
      </a>
      <SiteLoader />
      <JsonLd data={siteJsonLd(settings)} />
      {/* Dark by default; visitors can switch with the navbar toggle. A
          new storage key (not the old "nextjs-ui-theme") so stale values
          from the dark-only period can't override the dark default. */}
      <ThemeProvider defaultTheme="dark" storageKey={THEME_STORAGE_KEY}>
        <ConsentProvider>
          <SmoothScroll />
          <RevealObserver />
          <Navbar />
          <div className="min-h-svh bg-background">
            <main id="main" tabIndex={-1} className="outline-none">
              {children}
            </main>
          </div>
          <Footer />
        </ConsentProvider>
      </ThemeProvider>
    </SiteSettingsProvider>
  );
}
