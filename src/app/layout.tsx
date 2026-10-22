import type { Metadata, Viewport } from "next";

import "./globals.css";

import { inter } from "@/lib/fonts";
import { SITE_URL } from "@/config/site";
import { DEFAULT_SOCIAL_IMAGE, SITE_NAME } from "@/config/site";
import { siteSettings } from "@/features/cms/content/site-settings";

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
  description: siteSettings.description,
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // "dark" is the default and is rendered server-side, so a first-time
      // visitor never sees a flash. A returning visitor who chose light is
      // switched by `public/theme-init.js` before first paint; the class change
      // is why this needs suppressHydrationWarning.
      className={`dark ${inter.variable} antialiased`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        {/* A same-origin file, not inline HTML: no dangerouslySetInnerHTML. It must be a plain blocking
            <script> in <head> so it runs before first paint and a returning light-mode visitor never
            sees a dark flash (next/script would defer it until after hydration). See public/theme-init.js. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts -- intentional: must block to run before first paint */}
        <script src="/theme-init.js" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
