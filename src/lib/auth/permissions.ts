/**
 * Permission catalogue (RBAC). A permission is "<resource>:<action>".
 * This file is pure and shared by the UI (to hide controls) and the server
 * (to enforce). The server is the source of truth: UI checks are cosmetic.
 *
 * Each roadmap phase adds its resources here (cms, crm, sales, ...). Built-in
 * roles are defined in code below, so a new permission reaches them without a
 * data migration.
 */

export const RESOURCES = {
  content: {
    label: "Website content",
    actions: {
      view: "View blog posts, projects, events and partners",
      create: "Create content",
      update: "Edit content",
      publish: "Publish and unpublish",
      delete: "Delete content",
    },
  },
  leads: {
    label: "Leads (website enquiries)",
    actions: {
      view: "View leads",
      update: "Assign, qualify and disqualify leads",
      convert: "Convert leads into contacts and deals",
      delete: "Delete leads",
    },
  },
  contacts: {
    label: "Contacts",
    actions: {
      view: "View contacts",
      create: "Add contacts",
      update: "Edit contacts",
      delete: "Delete contacts",
    },
  },
  organizations: {
    label: "Organizations",
    actions: {
      view: "View organizations",
      create: "Add organizations",
      update: "Edit organizations",
      delete: "Delete organizations",
    },
  },
  deals: {
    label: "Deals & pipeline",
    actions: {
      view: "View deals",
      create: "Create deals",
      update: "Edit deals and move them between stages",
      close: "Close deals as won or lost, and reopen them",
      delete: "Delete deals",
    },
  },
  tasks: {
    label: "Tasks",
    actions: {
      view: "View tasks",
      create: "Create tasks",
      update: "Complete, edit and reassign tasks",
    },
  },
  users: {
    label: "People",
    actions: {
      view: "View people and invitations",
      invite: "Invite people",
      update: "Change people's roles",
      remove: "Remove people",
    },
  },
  roles: {
    label: "Roles & permissions",
    actions: { view: "View roles", manage: "Create, edit, and delete roles" },
  },
  audit: {
    label: "Audit log",
    actions: { view: "View the audit log" },
  },
  settings: {
    label: "Settings",
    actions: { view: "View settings", update: "Edit settings" },
  },
  owners: {
    label: "Owners",
    actions: { manage: "Assign, change, and remove Owners" },
  },
} as const;

export type Resource = keyof typeof RESOURCES;

type ActionOf<R extends Resource> = keyof (typeof RESOURCES)[R]["actions"] & string;

export type Permission = {
  [R in Resource]: `${R}:${ActionOf<R>}`;
}[Resource];

export const ALL_PERMISSIONS = (Object.keys(RESOURCES) as Resource[]).flatMap((resource) =>
  Object.keys(RESOURCES[resource].actions).map((action) => `${resource}:${action}` as Permission),
);

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as string[]).includes(value);
}

/* ------------------------------------------------------------ system roles */

export type SystemRoleKey = "owner" | "admin" | "editor" | "sales" | "viewer";

/** The order built-in roles are listed in, most powerful first. Custom roles follow, A to Z. */
export const SYSTEM_ROLE_ORDER: readonly SystemRoleKey[] = [
  "owner",
  "admin",
  "editor",
  "sales",
  "viewer",
];

/**
 * Built-in roles live in code. Owner can do everything. Admin can do
 * everything except the Owner-reserved power, so an Admin can run the platform
 * and the team but can never assign, change, or remove an Owner (nor grant
 * that power). Viewer is read-only on business pages and sees neither the
 * people list nor the role list.
 */
/** Permissions only people-and-platform administrators hold. */
const ADMINISTRATION: Permission[] = [
  "users:view",
  "users:invite",
  "users:update",
  "users:remove",
  "roles:view",
  "roles:manage",
  "audit:view",
  "settings:update",
  "owners:manage",
];

export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRoleKey, Permission[]> = {
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS.filter((permission) => permission !== "owners:manage"),
  // Runs the website's content: writes and publishes it, but cannot delete it or touch anything else.
  editor: ALL_PERMISSIONS.filter(
    (permission) => permission.startsWith("content:") && permission !== "content:delete",
  ),
  // Runs the sales pipeline end to end. Cannot delete records, edit website content or touch administration.
  sales: ALL_PERMISSIONS.filter(
    (permission) =>
      !ADMINISTRATION.includes(permission) &&
      !permission.endsWith(":delete") &&
      (!permission.startsWith("content:") || permission === "content:view"),
  ),
  viewer: ALL_PERMISSIONS.filter(
    (permission) =>
      permission.endsWith(":view") &&
      permission !== "users:view" &&
      permission !== "roles:view" &&
      permission !== "audit:view",
  ),
};

export const SYSTEM_ROLE_META: Record<SystemRoleKey, { name: string; description: string }> = {
  owner: { name: "Owner", description: "Full access, including people, roles, and settings." },
  admin: {
    name: "Admin",
    description: "Runs the platform and the team. Cannot assign, change, or remove Owners.",
  },
  editor: {
    name: "Content Editor",
    description:
      "Writes and publishes the website's blog, portfolio, events and partners. Cannot delete content.",
  },
  sales: {
    name: "Sales",
    description: "Works leads, contacts and deals. Cannot delete records or manage people.",
  },
  viewer: { name: "Viewer", description: "Read-only access to business and content pages." },
};

export function isSystemRoleKey(key: string): key is SystemRoleKey {
  return (SYSTEM_ROLE_ORDER as readonly string[]).includes(key);
}

/* ----------------------------------------------------------------- checks */

export function hasPermission(
  granted: ReadonlySet<string> | readonly string[],
  permission: Permission,
) {
  return Array.isArray(granted)
    ? granted.includes(permission)
    : (granted as ReadonlySet<string>).has(permission);
}

/**
 * Privilege-escalation rule: you may only grant (or assign a role containing)
 * permissions that you hold yourself.
 */
export function canGrantAll(
  actor: ReadonlySet<string> | readonly string[],
  permissions: readonly string[],
) {
  return permissions.every((permission) => hasPermission(actor, permission as Permission));
}

/** Effective permissions of a stored role (system roles come from code). */
export function resolvePermissions(role: {
  key: string;
  isSystem: boolean;
  permissions: { permission: string }[];
}): Permission[] {
  return role.isSystem && isSystemRoleKey(role.key)
    ? SYSTEM_ROLE_PERMISSIONS[role.key]
    : role.permissions.map((row) => row.permission).filter(isPermission);
}

/**
 * Normalises a permission set: drops unknown values and adds the matching
 * "view" permission whenever a resource has any other permission (you cannot
 * edit what you cannot see).
 */
export function normalisePermissions(values: readonly string[]): Permission[] {
  const set = new Set<Permission>(values.filter(isPermission));
  for (const permission of Array.from(set)) {
    const resource = permission.split(":")[0] as Resource;
    const view = `${resource}:view`;
    if (isPermission(view)) set.add(view);
  }
  return Array.from(set);
}
