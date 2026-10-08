import type { Metadata } from "next";

import "./globals.css";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { inter } from "@/lib/fonts";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { RevealObserver } from "@/components/motion/reveal-observer";
import { SiteLoader } from "@/components/motion/site-loader";
import { JsonLd } from "@/components/shared/json-ld";
import { SITE_URL } from "@/lib/site";

const THEME_STORAGE_KEY = "cafton-theme";

// Runs before first paint: applies a stored light preference so returning
// light-mode visitors don't see a dark flash. Anything else stays dark.
const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var r=document.documentElement;if(t==="light"||(t==="system"&&matchMedia("(prefers-color-scheme: light)").matches)){r.classList.remove("dark");r.classList.add("light")}}catch(e){}`;

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
    "https://www.tiktok.com/@cafton.official",
    "https://www.youtube.com/@caftonofficial",
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  icons: {
    // The tab icon follows the browser's own light/dark setting, not the
    // site's theme toggle: a page can't drive its tab icon from JS state.
    icon: [
      { url: "/favicon-light.svg", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-dark.svg", media: "(prefers-color-scheme: dark)" },
    ],
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
      // "dark" is the default and is rendered server-side, so a first-time
      // visitor never sees a flash. A returning visitor who chose light is
      // switched by `THEME_INIT_SCRIPT` before first paint; the class change
      // is why this needs suppressHydrationWarning.
      className={`dark ${inter.variable} antialiased`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={inter.className}>
        <SiteLoader />
        <JsonLd data={organizationJsonLd} />
        {/* Dark by default; visitors can switch with the navbar toggle. A
            new storage key (not the old "nextjs-ui-theme") so stale values
            from the dark-only period can't override the dark default. */}
        <ThemeProvider defaultTheme="dark" storageKey={THEME_STORAGE_KEY}>
          <SmoothScroll />
          <RevealObserver />
          <Navbar />
          <div className="min-h-dvh bg-background">
            <main>{children}</main>
          </div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
