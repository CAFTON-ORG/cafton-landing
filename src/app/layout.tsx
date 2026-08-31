import type { Metadata } from "next";

import "./globals.css";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { inter } from "@/lib/fonts";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { SITE_URL } from "@/lib/site";

const SITE_TITLE = "CAFTON";
const SITE_DESCRIPTION = "CAFTON - Modern software solutions for growing teams.";

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
      // light first. Remove alongside forcedTheme when the toggle returns.
      className={`dark ${inter.variable} antialiased`}
      style={{ colorScheme: "dark" }}
      data-scroll-behavior="smooth"
    >
      <body className={inter.className}>
        {/* Theme toggle is commented out of the navbar for now -- forcedTheme pins
            the site to dark and ignores any previously stored preference.
            Drop `forcedTheme` (and restore the navbar toggle) to re-enable. */}
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
