"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/dashboard/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/dashboard/ui/tooltip";
import {
  isActivePath,
  isParent,
  leavesOf,
  visibleNavGroups,
  type NavLeaf,
  type NavParent,
} from "@/config/dashboard-navigation";
import { cn } from "@/lib/utils";
import { useStaff } from "./staff-context";

function NavLink({
  item,
  active,
  collapsed,
  nested,
  onNavigate,
}: {
  item: NavLeaf;
  active: boolean;
  collapsed?: boolean;
  /** Inside a parent: indented, with a guide line. */
  nested?: boolean;
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
      <Icon className={cn("shrink-0", nested ? "size-3.5" : "size-4")} aria-hidden="true" />
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

/* -------------------------------------------- what the person chose to fold or open */

const STATE_KEY = "cafton-nav-state";
const STATE_EVENT = "cafton-nav-state-change";
type SectionState = Record<string, boolean>;
const NONE: SectionState = {};
let cache: { raw: string | null; value: SectionState } = { raw: null, value: NONE };

function readState(): SectionState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw === cache.raw) return cache.value;
    const saved: unknown = JSON.parse(raw ?? "{}");
    const value: SectionState = {};
    if (saved && typeof saved === "object" && !Array.isArray(saved))
      for (const [key, choice] of Object.entries(saved))
        if (typeof choice === "boolean") value[key] = choice;
    cache = { raw, value };
    return value;
  } catch {
    return NONE; // private window or blocked storage: every section follows the current page
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(STATE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(STATE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * What the person chose for each group and parent: true opens it, false folds it. A section they
 * never touched follows the page: the one holding the current page is open, the rest are closed.
 * Like a Discord category, any section can be folded, and a folded one still shows the page the
 * person is on, so they never lose their place.
 */
function useSectionState() {
  const state = useSyncExternalStore(subscribe, readState, () => NONE);
  const choose = (label: string, open: boolean) => {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({ ...state, [label]: open }));
    } catch {
      /* not remembered, still works for this page view */
    }
    window.dispatchEvent(new Event(STATE_EVENT));
  };
  return { state, choose };
}

/** The parent of a collapsed sidebar: an icon that opens a small menu of its pages beside it. */
function NavFlyout({
  item,
  pathname,
  hasActive,
  onNavigate,
}: {
  item: NavParent;
  pathname: string;
  hasActive: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        openOnHover
        delay={80}
        closeDelay={180}
        aria-label={item.label}
        className={cn(
          "focus-visible:ring-sidebar-ring relative flex min-h-9 items-center justify-center rounded-md px-0 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
          hasActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent side="right" align="start" sideOffset={8} className="w-56 gap-0.5 p-1.5">
        <p className="text-muted-foreground px-2.5 py-1 text-xs font-medium tracking-wide uppercase">
          {item.label}
        </p>
        {item.children.map((child) => (
          <NavLink
            key={child.href}
            item={child}
            active={isActivePath(pathname, child.href)}
            onNavigate={() => {
              setOpen(false);
              onNavigate?.();
            }}
          />
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** A parent: a button that folds or opens its pages. Folded, it still shows the page the person is on. */
function NavParentItem({
  item,
  id,
  pathname,
  choice,
  onChoose,
  activeOnly = false,
  collapsed,
  onNavigate,
}: {
  item: NavParent;
  id: string;
  pathname: string;
  /** What the person chose, if anything; otherwise it follows the page. */
  choice?: boolean;
  onChoose: (open: boolean) => void;
  /** Its group is folded: show only the current page. */
  activeOnly?: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const hasActive = item.children.some((child) => isActivePath(pathname, child.href));
  const open = !activeOnly && (choice ?? hasActive);
  const shown = open
    ? item.children
    : item.children.filter((child) => isActivePath(pathname, child.href));
  const Icon = item.icon;

  // The rail has no room for a tree: the parent is one icon, and its pages fly out beside it
  // on hover or focus (or a click, for touch and keyboard).
  if (collapsed) {
    return (
      <NavFlyout item={item} pathname={pathname} hasActive={hasActive} onNavigate={onNavigate} />
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onChoose(!open)}
        className={cn(
          "focus-visible:ring-sidebar-ring flex min-h-9 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
          hasActive
            ? "text-sidebar-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">{item.label}</span>
        <ChevronDown
          className={cn("size-3.5 transition-transform", !open && "-rotate-90")}
          aria-hidden="true"
        />
      </button>
      <div
        id={id}
        hidden={shown.length === 0}
        className="border-sidebar-border ml-5 flex flex-col gap-0.5 border-l pl-2"
      >
        {shown.map((child) => (
          <NavLink
            key={child.href}
            item={child}
            nested
            active={isActivePath(pathname, child.href)}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
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
  const { state, choose } = useSectionState();

  return (
    <nav aria-label="Main" className="flex flex-col gap-2">
      {groups.map((group, index) => {
        const hasActive = leavesOf(group.items).some((leaf) => isActivePath(pathname, leaf.href));
        // Any group can be folded. A folded group still shows the page the person is on; the rail has no headings to fold.
        const isOpen = collapsed || !group.label || (state[group.label] ?? hasActive);
        const foldedWithActive = !isOpen && hasActive;
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
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => choose(group.label, !isOpen)}
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground focus-visible:ring-sidebar-ring flex items-center justify-between rounded-md px-3 py-1 text-xs font-medium tracking-wide uppercase focus-visible:ring-2 focus-visible:outline-none"
              >
                {group.label}
                <ChevronDown
                  className={cn("size-3.5 transition-transform", !isOpen && "-rotate-90")}
                  aria-hidden="true"
                />
              </button>
            )}
            <div id={panelId} hidden={!isOpen && !hasActive} className="flex flex-col gap-0.5">
              {(foldedWithActive
                ? group.items.filter((item) =>
                    leavesOf([item]).some((leaf) => isActivePath(pathname, leaf.href)),
                  )
                : group.items
              ).map((item, itemIndex) =>
                isParent(item) ? (
                  <NavParentItem
                    key={item.label}
                    item={item}
                    id={`nav-parent-${index}-${itemIndex}`}
                    pathname={pathname}
                    choice={state[`${group.label}/${item.label}`]}
                    onChoose={(value) => choose(`${group.label}/${item.label}`, value)}
                    activeOnly={foldedWithActive}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                ) : (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={isActivePath(pathname, item.href)}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                ),
              )}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
