"use client";

import { useState, type CSSProperties } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/theme/mode-toggle";
import { DotPattern } from "@/components/shared/dot-pattern";
import { Logo } from "@/components/shared/logo";
import { navigationItems } from "@/components/layout/nav-items";
import { socialLinks } from "@/components/layout/social-links";
import { servicePillars } from "@/lib/services";
import { cn } from "@/lib/utils";

/** Staggered entrance for the items inside the open menu; off for reduced motion. */
const ENTER =
  "animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards duration-500 [animation-delay:calc(var(--i)*55ms+80ms)] motion-reduce:animate-none";

/**
 * Full-screen mobile menu, opened from the hamburger in the floating pill.
 *
 * Built on Radix Dialog, so the platform behaviour is the standard modal
 * dialog pattern rather than a hand-rolled one: `role="dialog"` with
 * `aria-modal`, focus moved in and trapped, Esc to close, focus returned to
 * the hamburger, page scroll locked. On top of that:
 * - the bar at the top is drawn in the same place and shape as the header
 *   pill, so the pill appears to stay put while the menu opens beneath it;
 * - links are full-width rows at least 56px tall (well past the 44px touch
 *   target guidance), numbered, with the current page marked and exposed with
 *   `aria-current`;
 * - the Services pages are listed inline under their parent rather than
 *   hidden in a disclosure, so nothing needs a second tap to find;
 * - the actions sit at the bottom, in thumb reach, with safe-area padding;
 * - the scrim is the solid page colour, never a backdrop blur, which would be
 *   re-composited over a moving page on every frame.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 cursor-pointer rounded-full xl:hidden"
        >
          <Menu className="size-5" aria-hidden="true" />
          <span className="sr-only">Open menu</span>
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Content
          className="fixed inset-0 z-60 flex flex-col bg-background outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:duration-200 data-[state=open]:duration-200 motion-reduce:animate-none xl:hidden"
        >
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <Dialog.Description className="sr-only">
            Site navigation, theme and contact options.
          </Dialog.Description>

          <div className="pointer-events-none absolute inset-0">
            <DotPattern size="md" fadeStyle="ellipse" opacity="low" />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--foreground)_9%,transparent)_0%,transparent_60%)]"
          />

          {/* Same position and shape as the header pill. */}
          <div className="relative mx-3 mt-[max(0.5rem,env(safe-area-inset-top))] flex h-12 shrink-0 items-center justify-between rounded-full border border-foreground/15 bg-background/95 py-1.5 pl-4 pr-1.5">
            <Link
              href="/"
              onClick={close}
              className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <Logo size={26} aria-hidden="true" />
              <span className="font-bold uppercase">Cafton</span>
            </Link>
            <div className="flex items-center gap-1">
              <ModeToggle variant="ghost" className="size-10 rounded-full" />
              <Dialog.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 cursor-pointer rounded-full"
                >
                  <X className="size-5" aria-hidden="true" />
                  <span className="sr-only">Close menu</span>
                </Button>
              </Dialog.Close>
            </div>
          </div>

          <nav
            aria-label="Mobile navigation"
            className="relative flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4"
          >
            <ol className="border-t">
              {navigationItems.map((item, index) => {
                const current =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <li
                    key={item.name}
                    style={{ "--i": index } as CSSProperties}
                    className={cn("border-b", ENTER)}
                  >
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-current={pathname === item.href ? "page" : undefined}
                      className="group flex min-h-16 items-center gap-4 rounded-md py-3 outline-none focus-visible:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring"
                    >
                      <span className="w-6 text-xs font-semibold tabular-nums tracking-[0.2em] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "flex-1 text-3xl font-bold tracking-tight transition-transform duration-300 group-active:translate-x-1",
                          current ? "text-foreground" : "text-foreground/75",
                        )}
                      >
                        {item.name}
                      </span>
                      {current && (
                        <span aria-hidden="true" className="size-2 rounded-full bg-foreground" />
                      )}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-5 text-muted-foreground"
                      />
                    </Link>

                    {item.name === "Services" && (
                      <ul className="mb-3 ml-10 grid gap-0.5 border-l pl-4">
                        {servicePillars.map((pillar) => (
                          <li key={pillar.slug}>
                            <Link
                              href={`/services/${pillar.slug}`}
                              onClick={close}
                              aria-current={
                                pathname === `/services/${pillar.slug}` ? "page" : undefined
                              }
                              className={cn(
                                "flex min-h-11 items-center gap-3 rounded-md text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                                pathname === `/services/${pillar.slug}`
                                  ? "font-semibold text-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              <pillar.icon className="size-4 shrink-0" aria-hidden="true" />
                              {pillar.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          <div
            style={{ "--i": navigationItems.length } as CSSProperties}
            className={cn(
              "relative shrink-0 border-t px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5",
              ENTER,
            )}
          >
            <Button asChild size="lg" className="group h-12 w-full cursor-pointer rounded-full text-base">
              <Link href="/contact" onClick={close}>
                Contact Us
                <ArrowRight className="ms-2 size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <ul className="mt-5 flex justify-center gap-2.5">
              {socialLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    className="flex size-11 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                  >
                    {link.icon}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
