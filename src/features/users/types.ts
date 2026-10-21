export interface RoleOption {
  id: string;
  key: string;
  name: string;
}

export interface DashboardUser {
  /** The profile id, or `invite:<email>` for someone who has not signed in yet. */
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleKey: string;
  roleName: string;
  avatarUrl?: string;
  status: "Active" | "Invited";
  /** ISO date (yyyy-mm-dd) the person joined or was invited. */
  joined: string;
}

export const USER_STATUSES = ["Active", "Invited"] as const;
