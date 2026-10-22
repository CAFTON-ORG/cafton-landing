import "server-only";

import { revalidatePath } from "next/cache";

import { ActionError, NOT_CONFIGURED } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/dal";
import type { Permission } from "@/lib/auth/permissions";
import { isDatabaseConfigured } from "@/lib/env";

/** Start of every CRM action: authorize, then make sure there is a database to write to. */
export async function guard(permission: Permission) {
  const staff = await requirePermission(permission);
  if (!isDatabaseConfigured) throw new ActionError(NOT_CONFIGURED);
  return staff;
}

/** Everything a CRM change can affect. Cheap, and avoids a stale list after a write. */
export function refreshCrm() {
  for (const path of [
    "/dashboard",
    "/dashboard/crm",
    "/dashboard/crm/leads",
    "/dashboard/crm/deals",
    "/dashboard/crm/contacts",
    "/dashboard/crm/organizations",
    "/dashboard/crm/tasks",
    "/dashboard/audit",
  ]) {
    revalidatePath(path);
  }
  revalidatePath("/dashboard/crm/leads/[id]", "page");
  revalidatePath("/dashboard/crm/deals/[id]", "page");
  revalidatePath("/dashboard/crm/contacts/[id]", "page");
  revalidatePath("/dashboard/crm/organizations/[id]", "page");
}
