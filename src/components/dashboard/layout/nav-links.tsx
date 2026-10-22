"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/dashboard/ui/tooltip";
import { isActivePath, visibleNavGroups, type NavItem } from "@/config/dashboard-navigation";
import { cn } from "@/lib/utils";
import { useStaff } from "./staff-context";

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const { href, label, icon: Icon } = item;

  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "focus-visible:ring-sidebar-ring focus-visible:ring-2 focus-visible:outline-none",
        collapsed && "justify-center px-0",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className={cn("flex-1", collapsed && "sr-only")}>{label}</span>
    </Link>
  );

  if (!collapsed) return link;

  // The label is hidden when collapsed, so give sighted users a real tooltip (not just `title`).
  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

const CLOSED_KEY = "cafton-nav-closed";
const CLOSED_EVENT = "cafton-nav-closed-change";
const NONE: string[] = [];
let cache: { raw: string | null; value: string[] } = { raw: null, value: NONE };

function readClosed(): string[] {
  try {
    const raw = localStorage.getItem(CLOSED_KEY);
    if (raw === cache.raw) return cache.value;
    const saved: unknown = JSON.parse(raw ?? "[]");
    const value = Array.isArray(saved)
      ? saved.filter((x): x is string => typeof x === "string")
      : NONE;
    cache = { raw, value };
    return value;
  } catch {
    return NONE; // private window or blocked storage: every group stays open
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CLOSED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CLOSED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Which group headings the person has folded away, remembered per browser. */
function useClosedGroups() {
  const closed = useSyncExternalStore(subscribe, readClosed, () => NONE);
  const toggle = (label: string) => {
    const next = closed.includes(label) ? closed.filter((x) => x !== label) : [...closed, label];
    try {
      localStorage.setItem(CLOSED_KEY, JSON.stringify(next));
    } catch {
      /* not remembered, still works for this page view */
    }
    window.dispatchEvent(new Event(CLOSED_EVENT));
  };
  return { closed, toggle };
}

/** The grouped sidebar / drawer navigation, driven by `config/dashboard-navigation.ts` and the person's permissions. */
export function NavLinks({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { permissions } = useStaff();
  const groups = visibleNavGroups(permissions);
  const { closed, toggle } = useClosedGroups();

  return (
    <nav aria-label="Main" className="flex flex-col gap-2">
      {groups.map((group, index) => {
        const hasActive = group.items.some((item) => isActivePath(pathname, item.href));
        // The group holding the current page never folds away; the rail has no headings to fold.
        const open = collapsed || !group.label || hasActive || !closed.includes(group.label);
        const panelId = `nav-group-${index}`;
        return (
          <div
            key={group.label || "main"}
            role="group"
            aria-label={group.label || "General"}
            // Collapsed: no room for headings, so groups are divided by a hairline instead.
            className={cn("flex flex-col gap-0.5", collapsed && index > 0 && "border-t pt-3")}
          >
            {!collapsed && group.label && (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                disabled={hasActive}
                onClick={() => toggle(group.label)}
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground focus-visible:ring-sidebar-ring disabled:hover:text-sidebar-foreground/70 flex items-center justify-between rounded-md px-3 py-1 text-xs font-medium tracking-wide uppercase focus-visible:ring-2 focus-visible:outline-none disabled:cursor-default"
              >
                {group.label}
                <ChevronDown
                  className={cn("size-3.5 transition-transform", !open && "-rotate-90")}
                  aria-hidden="true"
                />
              </button>
            )}
            <div id={panelId} hidden={!open} className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActivePath(pathname, item.href)}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
