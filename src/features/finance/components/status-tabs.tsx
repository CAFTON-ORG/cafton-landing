"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { TabCount } from "@/components/dashboard/shared/tab-count";
import { cn } from "@/lib/utils";

export interface StatusTab {
  /** The value in the link; empty for "All". */
  value: string;
  label: string;
  count?: number;
}

/**
 * The status tabs above a finance list (All, Draft, Awaiting payment, Overdue, Paid): real links
 * that keep the list's other settings, so the view can be shared and Back works. The tab that is
 * on is the one whose value is in the link.
 */
export function StatusTabs({
  param,
  tabs,
  label,
}: {
  param: string;
  tabs: StatusTab[];
  label: string;
}) {
  const path = usePathname();
  const search = useSearchParams();
  const current = search.get(param) ?? "";

  const href = (value: string) => {
    const next = new URLSearchParams(search.toString());
    if (value) next.set(param, value);
    else next.delete(param);
    next.delete("page");
    const text = next.toString();
    return text ? `${path}?${text}` : path;
  };

  return (
    <nav aria-label={label} className="mb-3 overflow-x-auto border-b">
      <ul className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const active = tab.value === current;
          return (
            <li key={tab.value || "all"}>
              <Link
                href={href(tab.value)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-ring -mb-px inline-flex h-10 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  active
                    ? "border-primary text-foreground"
                    : "text-foreground/70 hover:text-foreground border-transparent",
                )}
              >
                {tab.label}
                {tab.count !== undefined && <TabCount n={tab.count} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
