"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
// Theme toggle removed -- the site is pinned to dark only (forcedTheme in
// layout.tsx). Restoring it is a two-line change: uncomment this import and
// its two usages below.
// import { ModeToggle } from "@/components/theme/mode-toggle";
import { Logo } from "@/components/shared/logo";
import { ServicesNavMenu } from "@/components/layout/services-nav-menu";

const navigationItems = [
  { name: "About", href: "/about" },
  { name: "Services", href: "/services" },
  { name: "Portfolio", href: "/portfolio" },
  { name: "Blog", href: "/blog" },
];

/** Corner-bracket hover accent, the same game-UI-reticle nod `ServiceSelectOverlay`'s tiles use -- fades in on hover/focus of the parent `group`. */
function CornerBrackets() {
  return (
    <>
      <span className="pointer-events-none absolute left-0.5 top-0.5 size-1.5 border-l border-t border-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-60" />
      <span className="pointer-events-none absolute right-0.5 top-0.5 size-1.5 border-r border-t border-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-60" />
      <span className="pointer-events-none absolute bottom-0.5 left-0.5 size-1.5 border-b border-l border-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-60" />
      <span className="pointer-events-none absolute bottom-0.5 right-0.5 size-1.5 border-b border-r border-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-60" />
    </>
  );
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const lenis = useLenis();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  // There's no separate "Home" nav item -- clicking the logo while already
  // on "/" is otherwise a no-op (Link doesn't navigate to the current
  // route), which reads as broken if you're scrolled down. Scroll to top
  // instead in that one case; everywhere else this is a normal Link.
  const handleLogoClick = () => {
    if (pathname !== "/") return;
    if (lenis) lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl transition-shadow duration-300 supports-[backdrop-filter]:bg-background/60 ${
        scrolled ? "shadow-sm" : "shadow-none"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <Link
            href="/"
            onClick={handleLogoClick}
            className="flex items-center space-x-2 cursor-pointer transition-opacity hover:opacity-80"
          >
            <Logo size={32} aria-hidden="true" />
            <span className="font-bold uppercase">Cafton</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 xl:flex"
        >
          {navigationItems.map((item) =>
            item.name === "Services" ? (
              <ServicesNavMenu key={item.name} />
            ) : (
              <Link
                key={item.name}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={`group relative inline-flex h-9 items-center justify-center rounded-md px-4 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  pathname === item.href
                    ? "font-semibold text-foreground"
                    : "font-medium text-muted-foreground hover:text-foreground"
                }`}
              >
                {pathname !== item.href && <CornerBrackets />}
                {item.name}
              </Link>
            ),
          )}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden xl:flex items-center space-x-2">
          {/* <ModeToggle variant="ghost" /> */}
          <Button asChild className="group cursor-pointer">
            <Link href="/contact">
              Contact Us
              <ArrowRight className="ms-2 size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="xl:hidden">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-full sm:w-[400px] p-0 gap-0 [&>button]:hidden overflow-hidden flex flex-col"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <SheetHeader className="space-y-0 p-4 pb-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Logo size={16} aria-hidden="true" />
                  </div>
                  <SheetTitle className="sr-only">CAFTON</SheetTitle>
                  <div className="ml-auto flex items-center gap-2">
                    {/* <ModeToggle variant="ghost" /> */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="cursor-pointer h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto">
                <nav className="p-6 space-y-1">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      aria-current={pathname === item.href ? "page" : undefined}
                      className={`group relative flex items-center rounded-lg px-4 py-3 text-base transition-colors ${
                        pathname === item.href
                          ? "font-semibold text-foreground"
                          : "font-medium hover:bg-accent hover:text-accent-foreground"
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      {pathname !== item.href && <CornerBrackets />}
                      {item.name}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Footer Actions */}
              <div className="border-t p-6">
                <Button size="lg" asChild className="group w-full cursor-pointer">
                  <Link href="/contact" onClick={() => setIsOpen(false)}>
                    Contact Us
                    <ArrowRight className="ms-2 size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
