import type { Metadata, Viewport } from "next";

import "./globals.css";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { inter } from "@/lib/fonts";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { RevealObserver } from "@/components/motion/reveal-observer";
import { SiteLoader } from "@/components/motion/site-loader";
import { JsonLd } from "@/components/shared/json-ld";
import { ConsentProvider } from "@/components/consent/consent-provider";
import { CONSENT_COOKIE } from "@/lib/consent";
import { SITE_URL } from "@/lib/site";
import { DEFAULT_SOCIAL_IMAGE, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { siteJsonLd } from "@/lib/structured-data";

const THEME_STORAGE_KEY = "cafton-theme";

// Runs before first paint, for two reasons:
// - applies a stored light preference so returning light-mode visitors don't
//   see a dark flash (anything else stays dark);
// - marks the page when a cookie choice already exists, so the server-rendered
//   cookie notice stays hidden for returning visitors instead of flashing.
const INIT_SCRIPT = `try{var r=document.documentElement;var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||(t==="system"&&matchMedia("(prefers-color-scheme: light)").matches)){r.classList.remove("dark");r.classList.add("light")}if(document.cookie.indexOf("${CONSENT_COOKIE}=")>-1)r.setAttribute("data-consent","")}catch(e){}`;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CAFTON - Software Development in Baguio City, Philippines",
    template: `%s - ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  icons: {
    // The tab icon follows the browser's own light/dark setting, not the
    // site's theme toggle: a page can't drive its tab icon from JS state.
    icon: [
      { url: "/favicon-light.svg", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-dark.svg", media: "(prefers-color-scheme: dark)" },
    ],
  },
  // Each page builds its own full social metadata (see lib/seo.ts); these are
  // the fallbacks for pages that don't, such as the 404.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_PH",
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    images: [DEFAULT_SOCIAL_IMAGE.url],
  },
  other: {
    "facebook-domain-verification": "i90eakb2wnfw34xea0iyyagoqp8nvz",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      // "dark" is the default and is rendered server-side, so a first-time
      // visitor never sees a flash. A returning visitor who chose light is
      // switched by `INIT_SCRIPT` before first paint; the class change
      // is why this needs suppressHydrationWarning.
      className={`dark ${inter.variable} antialiased`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
      </head>
      <body className={inter.className}>
        <a
          href="#main"
          className="sr-only fixed left-3 top-3 z-110 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background focus:not-sr-only focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          Skip to content
        </a>
        <SiteLoader />
        <JsonLd data={siteJsonLd} />
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
      </body>
    </html>
  );
}
