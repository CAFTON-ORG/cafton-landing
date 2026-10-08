"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/theme/mode-toggle";
import { Logo } from "@/components/shared/logo";
import { scrollToTop } from "@/components/providers/smooth-scroll";
import { ServicesNavMenu } from "@/components/layout/services-nav-menu";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { navigationItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

/**
 * Floating pill navigation. The `header` keeps a 4rem band in the flow (so the
 * layout maths of every page is unchanged) but is pulled over the content
 * below it with a negative margin and made click-through, so only the pill
 * itself is interactive and the page's own background shows around it. It
 * condenses and gains elevation once the page scrolls.
 *
 * Standards followed: a `header` landmark holding a labelled `nav`,
 * `aria-current="page"` on the active link, controls at least 36px tall
 * (WCAG 2.5.8 asks 24px, platform guidance 44px for the mobile menu button),
 * visible keyboard focus rings, and no motion for prefers-reduced-motion.
 * The surface is a translucent fill with a hairline border and a soft shadow;
 * it deliberately has no backdrop blur, which would be re-composited every
 * frame over the animating hero and the pinned sections.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // There's no separate "Home" nav item -- clicking the logo while already
  // on "/" is otherwise a no-op (Link doesn't navigate to the current
  // route), which reads as broken if you're scrolled down. Scroll to top
  // instead in that one case; everywhere else this is a normal Link.
  const handleLogoClick = () => {
    if (pathname !== "/") return;
    scrollToTop();
  };

  return (
    <header className="pointer-events-none sticky top-0 z-50 -mb-16 h-16">
      <div className="flex h-full items-start justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4">
        <div
          className={cn(
            "pointer-events-auto flex h-12 w-full items-center justify-between gap-2 rounded-full border py-1.5 pl-4 pr-1.5 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--foreground)_10%,transparent)] transition-[max-width,background-color,box-shadow,border-color] duration-300 ease-out motion-reduce:transition-none",
            scrolled
              ? "max-w-4xl border-foreground/15 bg-background/95 shadow-lg shadow-black/10"
              : "max-w-6xl border-foreground/10 bg-background/70",
          )}
        >
          <Link
            href="/"
            onClick={handleLogoClick}
            className="flex shrink-0 items-center gap-2 rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <Logo size={26} aria-hidden="true" />
            <span className="font-bold uppercase">Cafton</span>
          </Link>

          {/* Desktop navigation */}
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-0.5 xl:flex"
          >
            {navigationItems.map((item) =>
              item.name === "Services" ? (
                <ServicesNavMenu key={item.name} />
              ) : (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full px-4 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring",
                    pathname === item.href || pathname.startsWith(`${item.href}/`)
                      ? "bg-foreground/10 font-semibold text-foreground"
                      : "font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                  )}
                >
                  {item.name}
                </Link>
              ),
            )}
          </nav>

          {/* Desktop actions */}
          <div className="hidden shrink-0 items-center gap-1 xl:flex">
            <ModeToggle variant="ghost" className="size-9 rounded-full" />
            <Button asChild className="group h-9 cursor-pointer rounded-full px-4">
              <Link href="/contact">
                Contact Us
                <ArrowRight className="ms-1 size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>

          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
