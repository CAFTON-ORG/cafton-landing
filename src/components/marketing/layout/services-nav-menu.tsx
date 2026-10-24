"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Logo } from "@/components/shared/logo";
import { useServicePillars, useServicesDetail } from "@/providers/site-settings";

/** Hover/focus mega menu for the "Services" nav item -- a promo panel plus the 4 service pillars. */
export function ServicesNavMenu() {
  const servicePillars = useServicePillars();
  const detail = useServicesDetail();
  const pathname = usePathname();
  const isActive = pathname === "/services" || pathname.startsWith("/services/");

  return (
    <NavigationMenu viewport={false} delayDuration={100}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger
            className={`h-10 rounded-full bg-transparent px-4 text-sm hover:bg-foreground/5 focus:bg-transparent data-[state=open]:bg-foreground/10 ${
              isActive
                ? "bg-foreground/10 font-semibold text-foreground"
                : "font-medium text-muted-foreground hover:text-foreground data-[state=open]:text-foreground"
            }`}
          >
            Services
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-[640px] grid-cols-[220px_1fr] gap-4 p-2">
              <Link
                href="/services"
                className="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-border bg-muted/40 p-5 outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_0%_0%,color-mix(in_oklch,var(--foreground)_10%,transparent),transparent_70%)]"
                />
                <div className="relative flex items-center justify-between">
                  <Logo size={36} className="text-foreground" aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {servicePillars.length} services
                  </span>
                </div>
                <div className="relative">
                  <p className="mt-8 text-balance text-sm font-semibold leading-snug text-foreground">
                    {detail.navTagline}
                  </p>
                  <span className="mt-4 inline-flex h-9 items-center rounded-full bg-foreground px-4 text-xs font-medium text-background">
                    {detail.navLinkLabel}
                    <ArrowRight
                      className="ms-1.5 size-3.5 transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </Link>

              <ul className="grid grid-cols-2 gap-1">
                {servicePillars.map((pillar) => {
                  const current = pathname === `/services/${pillar.slug}`;
                  return (
                    <li key={pillar.slug}>
                      <NavigationMenuLink asChild>
                        <Link
                          href={`/services/${pillar.slug}`}
                          aria-current={current ? "page" : undefined}
                          className={`group relative flex h-full flex-col gap-2 rounded-md p-3 outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring ${
                            current ? "bg-muted" : ""
                          }`}
                        >
                          <span className="flex items-center justify-between">
                            <pillar.icon className="size-5 text-foreground" aria-hidden="true" />
                            <ArrowUpRight
                              className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                              aria-hidden="true"
                            />
                          </span>
                          <span className="text-balance text-sm font-semibold leading-snug text-foreground">
                            {pillar.title}
                          </span>
                          <span className="text-xs leading-5 text-muted-foreground">
                            {pillar.tagline}
                          </span>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
