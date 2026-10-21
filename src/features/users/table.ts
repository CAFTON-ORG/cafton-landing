import type { TableParamsConfig } from "@/lib/table-params";
import { USER_STATUSES } from "./types";

/** URL-driven state for the people list. Role keys are not fixed (custom roles), so the caller supplies them. */
export function usersTableConfig(roleKeys: readonly string[]): TableParamsConfig {
  return {
    filters: { status: USER_STATUSES, role: roleKeys },
    sortable: ["name", "role", "status", "joined"],
    defaultSort: { sort: "name", dir: "asc" },
  };
}
