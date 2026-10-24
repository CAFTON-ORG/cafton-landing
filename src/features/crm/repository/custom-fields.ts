import "server-only";

import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import {
  CUSTOM_FILTER_PREFIX,
  customConditions,
  type CustomEntity,
  type CustomFieldDef,
  type CustomType,
} from "../rules/custom-fields";

const toDef = (row: {
  id: string;
  entity: string;
  key: string;
  label: string;
  type: string;
  options: string[];
  required: boolean;
  active: boolean;
  position: number;
}): CustomFieldDef => ({
  id: row.id,
  entity: row.entity as CustomEntity,
  key: row.key,
  label: row.label,
  type: row.type as CustomType,
  options: row.options,
  required: row.required,
  active: row.active,
  position: row.position,
});

/** One kind of record's fields, in the order they are shown. Archived ones only when asked for. */
export async function listCustomFields(
  entity: CustomEntity,
  { includeArchived = false }: { includeArchived?: boolean } = {},
): Promise<CustomFieldDef[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.customField.findMany({
    where: { entity, ...(includeArchived ? {} : { active: true }) },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toDef);
}

/** Every field of every kind, for the settings screen. */
export async function listAllCustomFields(): Promise<CustomFieldDef[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.customField.findMany({
    orderBy: [{ entity: "asc" }, { position: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toDef);
}

/**
 * The `where` conditions for the custom-field filters in a list's URL (`?cf_region=North`). One
 * extra query for the field list, and only when such a filter is present.
 */
export async function customFilterWhere(
  entity: CustomEntity,
  filters: Record<string, string>,
): Promise<{ custom: { path: string[]; equals: string | boolean } }[]> {
  if (!Object.keys(filters).some((id) => id.startsWith(CUSTOM_FILTER_PREFIX) && filters[id])) {
    return [];
  }
  const defs = await listCustomFields(entity);
  return customConditions(filters, defs).map(({ key, equals }) => ({
    custom: { path: [key], equals },
  }));
}
