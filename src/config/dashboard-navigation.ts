import {
  Building2,
  CalendarDays,
  Workflow,
  Contact,
  FileText,
  FolderKanban,
  Handshake,
  History,
  Images,
  Inbox,
  LayoutDashboard,
  LayoutList,
  LayoutTemplate,
  ListChecks,
  MessageCircleQuestion,
  Newspaper,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Permission } from "@/lib/auth/permissions";

/** A page. */
export type NavLeaf = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hidden from staff who do not hold it. Omit for pages every staff member may open. */
  permission?: Permission;
  /** Extra words the command palette matches on. */
  keywords?: string[];
  /** A count shown beside the label when it is above zero. */
  badge?: "newLeads" | "meetingRequests" | "overdueTasks";
};

/** A heading that holds pages (one level only: deeper trees are hard to scan and to use on a phone). */
export type NavParent = { label: string; icon: LucideIcon; children: NavLeaf[] };

export type NavItem = NavLeaf | NavParent;

/** An empty label means the group is shown without a heading. */
export type NavGroup = { label: string; items: NavItem[] };

export const isParent = (item: NavItem): item is NavParent => "children" in item;

/** Every page of a list of items, with parents opened up. */
export const leavesOf = (items: NavItem[]): NavLeaf[] =>
  items.flatMap((item) => (isParent(item) ? item.children : [item]));

/**
 * The dashboard's navigation: the sidebar, the mobile drawer, the breadcrumbs
 * and the command palette all read this one list. Add a page here and it shows
 * up everywhere, for exactly the people who may open it.
 *
 * Shape (the usual answer to "too many sidebar items"): a few top-level groups that fold,
 * and inside a group at most one level of parent, so the person sees only the section they
 * are working in. Everything else is one keystroke away in the command palette (Ctrl/⌘ K).
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
        label: "Content",
        icon: Newspaper,
        children: [
          {
            href: "/dashboard/content/pages",
            label: "Pages",
            icon: LayoutTemplate,
            permission: "content:view",
            keywords: [
              "about",
              "careers",
              "privacy",
              "legal",
              "services",
              "home",
              "contact",
              "values",
              "text",
              "wording",
            ],
          },
          {
            href: "/dashboard/content/blog",
            label: "Blog posts",
            icon: FileText,
            permission: "content:view",
            keywords: ["articles", "writing", "news", "cms"],
          },
          {
            href: "/dashboard/content/projects",
            label: "Portfolio",
            icon: FolderKanban,
            permission: "content:view",
            keywords: ["projects", "case studies", "work"],
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
            icon: Handshake,
            permission: "content:view",
            keywords: ["sponsors", "logos"],
          },
          {
            href: "/dashboard/content/faqs",
            label: "Service questions",
            icon: MessageCircleQuestion,
            permission: "content:view",
            keywords: ["faq", "questions", "answers", "services"],
          },
        ],
      },
      {
        href: "/dashboard/content/media",
        label: "Media",
        icon: Images,
        permission: "content:view",
        keywords: ["photos", "uploads", "pictures", "images", "library"],
      },
      {
        href: "/dashboard/content/site",
        label: "Site settings",
        icon: SlidersHorizontal,
        permission: "settings:view",
        keywords: ["contact", "email", "social", "footer", "company", "seo", "google", "share"],
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
        badge: "newLeads",
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
        badge: "overdueTasks",
        permission: "tasks:view",
        keywords: ["to-do", "follow up", "reminders"],
      },
      {
        href: "/dashboard/crm/pipelines",
        label: "Pipelines",
        icon: Workflow,
        permission: "pipelines:manage",
        keywords: ["stages", "funnel", "probability", "sales process"],
      },
      {
        href: "/dashboard/crm/schedule",
        label: "Schedule",
        icon: CalendarDays,
        badge: "meetingRequests",
        permission: "meetings:view",
        keywords: ["meetings", "calendar", "booking", "appointments", "calls"],
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

/** Every page in the navigation, flat. */
export const navItems = navGroups.flatMap((group) => leavesOf(group.items));

/** Labels for breadcrumb segments that are not a nav item of their own. */
export const segmentLabels: Record<string, string> = {
  dashboard: "Overview",
  crm: "CRM",
  content: "Website",
  seo: "Search and sharing",
  settings: "Settings",
};

export function isActivePath(pathname: string, href: string) {
  const matches = (candidate: string) =>
    pathname === candidate || pathname.startsWith(`${candidate}/`);
  if (!matches(href)) return false;
  // The most specific item wins, so "/dashboard/crm" is not lit up on "/dashboard/crm/leads".
  return !navItems.some((other) => other.href.length > href.length && matches(other.href));
}

/** The groups a staff member may see, dropping parents and groups left empty. */
export function visibleNavGroups(permissions: readonly string[]): NavGroup[] {
  const allowed = (leaf: NavLeaf) => !leaf.permission || permissions.includes(leaf.permission);
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.flatMap((item): NavItem[] => {
        if (!isParent(item)) return allowed(item) ? [item] : [];
        const children = item.children.filter(allowed);
        return children.length > 0 ? [{ ...item, children }] : [];
      }),
    }))
    .filter((group) => group.items.length > 0);
}
