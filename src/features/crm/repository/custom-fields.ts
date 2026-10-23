import "server-only";

import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import type { CustomEntity, CustomFieldDef, CustomType } from "../custom-fields";

const toDef = (row: {
  id: string;
  entity: string;
  key: string;
  label: string;
  type: string;
  options: string[];
  active: boolean;
  position: number;
}): CustomFieldDef => ({
  id: row.id,
  entity: row.entity as CustomEntity,
  key: row.key,
  label: row.label,
  type: row.type as CustomType,
  options: row.options,
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
