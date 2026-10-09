"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TocItem {
  id: string;
  title: string;
}

/**
 * "On this page" navigation for long documents. A sticky list beside the text
 * on wide screens, with the section being read marked `aria-current`; a
 * collapsed disclosure above the text on narrow ones, so it never pushes the
 * content down.
 */
export function TableOfContents({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (sections.length === 0) return;

    // The section whose top has most recently crossed the line just under the header.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -65% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  const links = (
    <ol className="space-y-1">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            aria-current={active === item.id ? "location" : undefined}
            className={cn(
              "block rounded-md border-s-2 py-1.5 ps-3 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring",
              active === item.id
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.title}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <nav aria-label="On this page">
      <details className="group rounded-lg border lg:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold">
          On this page
          <ChevronDown
            className="size-4 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="border-t px-2 py-2">{links}</div>
      </details>

      <div className="hidden lg:block">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          On this page
        </p>
        {links}
      </div>
    </nav>
  );
}
