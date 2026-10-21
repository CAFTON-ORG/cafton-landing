"use client";

import Link from "next/link";
import { Brand } from "@/components/dashboard/shared/brand";
import { cn } from "@/lib/utils";
import { NavLinks } from "./nav-links";
import { useSidebar } from "./sidebar-context";
import { SidebarUserMenu } from "./sidebar-user-menu";

/** The desktop sidebar. It collapses to an icon-only rail, driven by the trigger in the
 * app bar (`sidebar-trigger.tsx`) or ⌘/Ctrl+B; below `md` it is hidden and the same
 * navigation lives in the app bar's drawer (see `mobile-nav.tsx`). */
export function Sidebar() {
  const { collapsed } = useSidebar();

  return (
    <aside
      className={cn(
        "bg-background sticky top-0 hidden h-screen shrink-0 flex-col border-r transition-[width] duration-200 motion-reduce:transition-none md:flex",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <Link
          href="/dashboard"
          className="rounded-md focus-visible:ring-2 focus-visible:outline-none"
        >
          <Brand showName={!collapsed} />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <NavLinks collapsed={collapsed} />
      </div>

      <div className="border-t p-3">
        <SidebarUserMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}
