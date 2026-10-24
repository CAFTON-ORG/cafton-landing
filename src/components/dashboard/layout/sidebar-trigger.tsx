"use client";

import { PanelLeft } from "lucide-react";
import { Button } from "@/components/dashboard/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/dashboard/ui/tooltip";
import { useSidebar } from "./sidebar-context";

/**
 * The collapse/expand control, placed where dashboards conventionally put it: the
 * leading edge of the app bar, next to the page title. Desktop only; phones get
 * the menu button that opens the drawer (see `mobile-nav.tsx`).
 */
export function SidebarTrigger() {
  const { collapsed, toggle } = useSidebar();
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={label}
            aria-expanded={!collapsed}
            aria-keyshortcuts="Control+B Meta+B"
            className="max-md:hidden"
          />
        }
      >
        <PanelLeft aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent side="bottom">{label} (⌘B)</TooltipContent>
    </Tooltip>
  );
}
