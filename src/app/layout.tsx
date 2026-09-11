import type { Metadata } from "next";

import "./globals.css";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { inter } from "@/lib/fonts";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { SiteLoader } from "@/components/motion/site-loader";
import { JsonLd } from "@/components/shared/json-ld";
import { SITE_URL } from "@/lib/site";

const SITE_TITLE = "CAFTON";
const SITE_DESCRIPTION = "CAFTON - Modern Software Solutions";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_TITLE,
  url: SITE_URL,
  logo: `${SITE_URL}/cafton.png`,
  sameAs: [
    "https://www.facebook.com/profile.php?id=61593222069389",
    "https://www.instagram.com/cafton.official",
    "https://www.linkedin.com/company/cafton",
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/cafton-lengthwise.png",
        width: 2000,
        height: 675,
        alt: "CAFTON",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/cafton-lengthwise.png"],
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
      // "dark" is rendered server-side so the first paint is already dark --
      // the provider only applies the class after mount, which would flash
      // light first. Remove alongside forcedTheme if the toggle ever returns.
      className={`dark ${inter.variable} antialiased`}
      style={{ colorScheme: "dark" }}
      data-scroll-behavior="smooth"
    >
      <body className={inter.className}>
        <SiteLoader />
        <JsonLd data={organizationJsonLd} />
        {/* Site is pinned to dark only -- forcedTheme ignores any stored
            preference so a visitor can't get stuck on a since-removed
            light mode. Restoring the toggle needs this prop dropped too. */}
        <ThemeProvider
          defaultTheme="dark"
          forcedTheme="dark"
          storageKey="nextjs-ui-theme"
        >
          <SmoothScroll>
            <Navbar />
            <div className="min-h-dvh bg-background">
              <main>{children}</main>
            </div>
            <Footer />
          </SmoothScroll>
        </ThemeProvider>
      </body>
    </html>
  );
}
