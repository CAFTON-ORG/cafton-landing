"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
        "relative flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        collapsed && "justify-center px-0",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
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

  return (
    <nav aria-label="Main" className="flex flex-col gap-4">
      {groups.map((group, index) => (
        <div
          key={group.label || "main"}
          role="group"
          aria-label={group.label || "General"}
          // Collapsed: no room for headings, so groups are divided by a hairline instead.
          className={cn("flex flex-col gap-1", collapsed && index > 0 && "border-t pt-3")}
        >
          {!collapsed && group.label && (
            <p className="text-muted-foreground px-3 text-xs font-medium tracking-wide uppercase">
              {group.label}
            </p>
          )}
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
      ))}
    </nav>
  );
}
