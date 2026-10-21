"use client";

import { Breadcrumbs } from "./breadcrumbs";
import { CommandPalette } from "./command-palette";
import { MobileNav } from "./mobile-nav";
import { SidebarTrigger } from "./sidebar-trigger";
import { ThemeToggle } from "./theme-toggle";

/** The sticky top bar: sidebar control, where-you-are, then search and theme. */
export function AppBar() {
  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur sm:px-6">
      <MobileNav />
      <SidebarTrigger />
      <div className="bg-border mx-1 h-5 w-px max-md:hidden" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>
      <CommandPalette />
      <ThemeToggle />
    </header>
  );
}
