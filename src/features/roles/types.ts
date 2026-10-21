import type { Permission } from "@/lib/auth/permissions";

export interface RoleSummary {
  id: string;
  key: string;
  name: string;
  description?: string;
  isSystem: boolean;
  people: number;
  permissions: Permission[];
}
