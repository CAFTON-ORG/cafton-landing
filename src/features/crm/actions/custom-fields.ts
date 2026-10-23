"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  CUSTOM_EDIT_PERMISSION,
  CUSTOM_ENTITIES,
  CUSTOM_TYPES,
  MAX_LABEL,
  MAX_OPTION,
  MAX_OPTIONS,
  applyCustomValues,
  canBeRequired,
  checkDefinition,
  checkFieldLimit,
  checkTypeChange,
  normalizeOptions,
  uniqueKey,
  type CustomEntity,
  type CustomFieldDef,
  type CustomType,
} from "../custom-fields";
import { live } from "../mappers";
import { guard, refreshCrm } from "./guard";

const definitionSchema = z.object({
  id: z.string().uuid().optional(),
  entity: z.enum(CUSTOM_ENTITIES),
  label: z
    .string()
    .trim()
    .max(MAX_LABEL * 2),
  type: z.enum(CUSTOM_TYPES),
  options: z
    .array(z.string().max(MAX_OPTION * 2))
    .max(MAX_OPTIONS * 2)
    .default([]),
  required: z.boolean().default(false),
});
export type CustomFieldInput = z.input<typeof definitionSchema>;

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
  ...row,
  entity: row.entity as CustomEntity,
  type: row.type as CustomType,
});

function refresh() {
  refreshCrm();
  revalidatePath("/dashboard/crm/custom-fields");
}

/** Adds a field, or changes an existing one's name and choices. Its key and type never change. */
export async function saveCustomField(
  input: CustomFieldInput,
): Promise<ActionResult<{ id: string; key: string }>> {
  return runAction(async () => {
    const actor = await guard("customfields:manage");
    const data = parse(definitionSchema, input);
    const options = data.type === "select" ? normalizeOptions(data.options) : [];
    const invalid = checkDefinition({ label: data.label, type: data.type, options });
    if (invalid) throw new ActionError(invalid, "validation", { label: invalid });
    const label = data.label.trim();
    const required = data.required && canBeRequired(data.type);

    const saved = await prisma.$transaction(async (tx) => {
      if (data.id) {
        const existing = await tx.customField.findUnique({ where: { id: data.id } });
        if (!existing) throw new ActionError("That field no longer exists.");
        const blocked = checkTypeChange(existing.type as CustomType, data.type);
        if (blocked) throw new ActionError(blocked, "rule");
        await tx.customField.update({
          where: { id: existing.id },
          data: { label, options, required },
        });
        await recordAudit(
          actor,
          {
            action: "custom_field.update",
            entity: "custom_field",
            entityId: existing.id,
            summary: `Updated the ${existing.entity} field ${label}`,
          },
          tx,
        );
        return { id: existing.id, key: existing.key };
      }

      const all = await tx.customField.findMany({
        where: { entity: data.entity },
        select: { key: true, active: true, position: true },
      });
      const full = checkFieldLimit(all.filter((field) => field.active).length);
      if (full) throw new ActionError(full, "rule");
      const created = await tx.customField.create({
        data: {
          entity: data.entity,
          key: uniqueKey(
            label,
            all.map((field) => field.key),
          ),
          label,
          type: data.type,
          options,
          required,
          position: all.reduce((highest, field) => Math.max(highest, field.position), -1) + 1,
        },
      });
      await recordAudit(
        actor,
        {
          action: "custom_field.create",
          entity: "custom_field",
          entityId: created.id,
          summary: `Added the ${created.entity} field ${label}`,
        },
        tx,
      );
      return { id: created.id, key: created.key };
    });
    refresh();
    return saved;
  });
}

/** Hides a field from forms, or brings it back. Its values are kept either way. */
export async function setCustomFieldActive(id: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("customfields:manage");
    await prisma.$transaction(async (tx) => {
      const field = await tx.customField.findUnique({ where: { id } });
      if (!field) throw new ActionError("That field no longer exists.");
      if (active && !field.active) {
        const count = await tx.customField.count({ where: { entity: field.entity, active: true } });
        const full = checkFieldLimit(count);
        if (full) throw new ActionError(full, "rule");
      }
      await tx.customField.update({ where: { id }, data: { active } });
      await recordAudit(
        actor,
        {
          action: active ? "custom_field.restore" : "custom_field.archive",
          entity: "custom_field",
          entityId: id,
          summary: `${active ? "Restored" : "Archived"} the ${field.entity} field ${field.label}`,
        },
        tx,
      );
    });
    refresh();
  });
}

const valuesSchema = z.object({
  entity: z.enum(CUSTOM_ENTITIES),
  id: z.string().uuid(),
  values: z.record(z.string().max(60), z.unknown()).refine((v) => Object.keys(v).length <= 60),
});
export type CustomValuesInput = z.input<typeof valuesSchema>;

/** Saves what was filled in for a record's custom fields. Only active fields can be written. */
export async function setCustomValues(input: CustomValuesInput): Promise<ActionResult> {
  return runAction(async () => {
    const data = parse(valuesSchema, input);
    const actor = await guard(CUSTOM_EDIT_PERMISSION[data.entity]);

    await prisma.$transaction(async (tx) => {
      const defs = (
        await tx.customField.findMany({ where: { entity: data.entity, active: true } })
      ).map(toDef);
      const where = { id: data.id, ...live };
      const row =
        data.entity === "lead"
          ? await tx.lead.findFirst({ where, select: { custom: true } })
          : data.entity === "contact"
            ? await tx.contact.findFirst({ where, select: { custom: true } })
            : data.entity === "organization"
              ? await tx.organization.findFirst({ where, select: { custom: true } })
              : await tx.deal.findFirst({ where, select: { custom: true } });
      if (!row) throw new ActionError("That record no longer exists.");

      const { values, errors } = applyCustomValues(row.custom, defs, data.values);
      if (Object.keys(errors).length > 0) {
        throw new ActionError(
          "Some of those values can't be saved. Check the marked fields.",
          "validation",
          errors,
        );
      }

      const custom = values as Prisma.InputJsonValue;
      const by = actorId(actor);
      const updated =
        data.entity === "lead"
          ? await tx.lead.updateMany({ where, data: { custom } })
          : data.entity === "contact"
            ? await tx.contact.updateMany({ where, data: { custom, updatedBy: by } })
            : data.entity === "organization"
              ? await tx.organization.updateMany({ where, data: { custom, updatedBy: by } })
              : await tx.deal.updateMany({ where, data: { custom, updatedBy: by } });
      if (updated.count === 0) throw new ActionError("That record no longer exists.");

      await recordAudit(
        actor,
        {
          action: `${data.entity}.custom`,
          entity: data.entity,
          entityId: data.id,
          summary: `Updated the custom fields of a ${data.entity}`,
        },
        tx,
      );
    });
    refreshCrm();
  });
}
