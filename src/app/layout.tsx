import type { Metadata, Viewport } from "next";

import "./globals.css";

import { inter } from "@/lib/fonts";
import { THEME_STORAGE_KEY } from "@/config/site";
import { CONSENT_COOKIE } from "@/lib/consent";
import { SITE_URL } from "@/config/site";
import { DEFAULT_SOCIAL_IMAGE, SITE_NAME } from "@/config/site";
import { getSiteSettings } from "@/features/cms/repository/site";
import { SiteSettingsProvider } from "@/providers/site-settings";

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

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: "CAFTON - Software Development in Baguio City, Philippines",
      template: `%s - ${SITE_NAME}`,
    },
    description: settings.description,
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
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
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
        {/* Must be a plain <script> in <head>: it runs while the HTML is parsed, before first paint, so a
            returning light-mode visitor never sees a dark flash. next/script defers it until after
            hydration, which defeats the purpose. React 19's dev-only "script tag while rendering"
            notice appears when the layout is re-rendered on the client (Fast Refresh, error overlay);
            the server-rendered script has already run, so production is unaffected. */}
        {/* eslint-disable-next-line react/no-danger -- audited: INIT_SCRIPT is a constant built only from our own constants, never from request or user data */}
        <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
      </head>
      <body className={inter.className}>
        <SiteSettingsProvider settings={settings}>{children}</SiteSettingsProvider>
      </body>
    </html>
  );
}
