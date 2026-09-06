"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Logo } from "@/components/shared/logo";
import { servicePillars } from "@/lib/services";

/** Hover/focus mega menu for the "Services" nav item -- a promo panel plus the 4 service pillars. */
export function ServicesNavMenu() {
  const pathname = usePathname();
  const isActive = pathname === "/services" || pathname.startsWith("/services/");

  return (
    <NavigationMenu viewport={false} delayDuration={100}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger
            className={`h-9 bg-transparent px-4 text-sm hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent ${
              isActive
                ? "font-semibold text-foreground"
                : "font-medium text-muted-foreground hover:text-foreground data-[state=open]:text-foreground"
            }`}
          >
            Services
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-[560px] grid-cols-[200px_1fr] gap-6 p-2">
              <Link
                href="/services"
                className="group flex flex-col justify-between rounded-lg border border-border bg-muted/40 p-5 transition-colors hover:bg-muted"
              >
                <Logo size={48} className="text-foreground" aria-hidden="true" />
                <div>
                  <p className="mt-6 text-sm font-semibold leading-snug text-foreground">
                    Software for the whole business, not just one corner of it.
                  </p>
                  <span className="mt-4 inline-flex items-center text-xs font-medium text-foreground">
                    View all services
                    <ArrowRight className="ms-1.5 size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>

              <ul className="grid grid-cols-2 gap-1">
                {servicePillars.map((pillar) => (
                  <li key={pillar.slug}>
                    <NavigationMenuLink asChild>
                      <Link
                        href={`/services/${pillar.slug}`}
                        className="flex h-full flex-col gap-2 rounded-md p-3 transition-colors hover:bg-muted"
                      >
                        <pillar.icon className="size-5 text-foreground" aria-hidden="true" />
                        <span className="text-sm font-semibold text-foreground">
                          {pillar.title}
                        </span>
                        <span className="text-xs leading-5 text-muted-foreground">
                          {pillar.tagline}
                        </span>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                ))}
              </ul>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
