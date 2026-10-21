"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/dashboard/ui/breadcrumb";
import { navItems, segmentLabels } from "@/config/dashboard-navigation";

type Crumb = { href: string; label: string };

/** "/projects/prj_001" → [Projects, Details]. Labels come from the nav config; ids become "Details". */
export function getCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const label =
      segmentLabels[segment] ??
      navItems.find((item) => item.href === href)?.label ??
      (index === 0 ? segment.charAt(0).toUpperCase() + segment.slice(1) : "Details");
    return { href, label };
  });
}

export function Breadcrumbs() {
  const crumbs = getCrumbs(usePathname());
  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <Fragment key={crumb.href}>
              {index > 0 && <BreadcrumbSeparator className="max-sm:hidden" />}
              <BreadcrumbItem className={last ? undefined : "max-sm:hidden"}>
                {last ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={crumb.href}>{crumb.label}</Link>} />
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
