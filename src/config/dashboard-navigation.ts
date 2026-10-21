import {
  Building2,
  Contact,
  CalendarDays,
  FileText,
  FolderKanban,
  Handshake as Partnership,
  Handshake,
  History,
  Inbox,
  LayoutDashboard,
  LayoutList,
  ListChecks,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Permission } from "@/lib/auth/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hidden from staff who do not hold it. Omit for pages every staff member may open. */
  permission?: Permission;
  /** Extra words the command palette matches on. */
  keywords?: string[];
};

/** An empty label means the group is shown without a heading. */
export type NavGroup = { label: string; items: NavItem[] };

/**
 * The dashboard's navigation: the sidebar, the mobile drawer, the breadcrumbs
 * and the command palette all read this one list. Add a page here and it shows
 * up everywhere, for exactly the people who may open it. Each roadmap phase adds
 * its group (CMS, CRM, Sales, ...) here.
 */
export const navGroups: NavGroup[] = [
  {
    label: "",
    items: [
      {
        href: "/dashboard",
        label: "Overview",
        icon: LayoutDashboard,
        keywords: ["home", "dashboard"],
      },
    ],
  },
  {
    label: "Website",
    items: [
      {
        href: "/dashboard/content/blog",
        label: "Blog posts",
        icon: FileText,
        permission: "content:view",
        keywords: ["articles", "writing", "news", "cms"],
      },
      {
        href: "/dashboard/content/projects",
        label: "Projects",
        icon: FolderKanban,
        permission: "content:view",
        keywords: ["portfolio", "case studies", "work"],
      },
      {
        href: "/dashboard/content/events",
        label: "Events",
        icon: CalendarDays,
        permission: "content:view",
        keywords: ["giveaway", "campaign"],
      },
      {
        href: "/dashboard/content/partners",
        label: "Partners",
        icon: Partnership,
        permission: "content:view",
        keywords: ["sponsors", "logos"],
      },
    ],
  },
  {
    label: "CRM",
    items: [
      {
        href: "/dashboard/crm",
        label: "Pipeline overview",
        icon: LayoutList,
        permission: "deals:view",
        keywords: ["forecast", "funnel", "sales"],
      },
      {
        href: "/dashboard/crm/leads",
        label: "Leads",
        icon: Inbox,
        permission: "leads:view",
        keywords: ["enquiries", "inquiries", "website", "contact form"],
      },
      {
        href: "/dashboard/crm/deals",
        label: "Deals",
        icon: Handshake,
        permission: "deals:view",
        keywords: ["pipeline", "board", "opportunities"],
      },
      {
        href: "/dashboard/crm/contacts",
        label: "Contacts",
        icon: Contact,
        permission: "contacts:view",
        keywords: ["people", "customers", "clients"],
      },
      {
        href: "/dashboard/crm/organizations",
        label: "Organizations",
        icon: Building2,
        permission: "organizations:view",
        keywords: ["companies", "clients", "accounts"],
      },
      {
        href: "/dashboard/crm/tasks",
        label: "Tasks",
        icon: ListChecks,
        permission: "tasks:view",
        keywords: ["to-do", "follow up", "reminders"],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        href: "/dashboard/users",
        label: "People",
        icon: Users,
        permission: "users:view",
        keywords: ["staff", "invite", "team"],
      },
      {
        href: "/dashboard/roles",
        label: "Roles",
        icon: ShieldCheck,
        permission: "roles:view",
        keywords: ["permissions", "access"],
      },
      {
        href: "/dashboard/audit",
        label: "Audit log",
        icon: History,
        permission: "audit:view",
        keywords: ["history", "changes", "activity"],
      },
      {
        href: "/dashboard/settings",
        label: "Settings",
        icon: Settings,
        permission: "settings:view",
        keywords: ["profile", "preferences", "theme"],
      },
    ],
  },
];

export const navItems = navGroups.flatMap((group) => group.items);

/** Labels for breadcrumb segments that are not a nav item of their own. */
export const segmentLabels: Record<string, string> = {
  dashboard: "Overview",
  crm: "CRM",
  content: "Website",
};

export function isActivePath(pathname: string, href: string) {
  const matches = (candidate: string) =>
    pathname === candidate || pathname.startsWith(`${candidate}/`);
  if (!matches(href)) return false;
  // The most specific item wins, so "/dashboard/crm" is not lit up on "/dashboard/crm/leads".
  return !navItems.some((other) => other.href.length > href.length && matches(other.href));
}

/** The groups a staff member may see, dropping empty ones. */
export function visibleNavGroups(permissions: readonly string[]): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || permissions.includes(item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
