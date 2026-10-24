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
  /** Takes a turn at new website enquiries (round-robin). */
  takesLeads: boolean;
  /** Whether their role can work on leads at all, so they can be in the turn order. */
  canWorkLeads: boolean;
}

export const USER_STATUSES = ["Active", "Invited"] as const;
