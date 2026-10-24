"use server";

import { z } from "zod";

import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { can, requirePermission } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";

export type ViewResource = "leads" | "contacts" | "organizations" | "deals";

export interface SavedViewItem {
  id: string;
  name: string;
  query: string;
  shared: boolean;
  mine: boolean;
}

const RESOURCES = ["leads", "contacts", "organizations", "deals"] as const;
const viewPermission = (resource: ViewResource) => `${resource}:view` as const;
const editPermission = (resource: ViewResource) => `${resource}:update` as const;

/** Saved views of one list: yours, and the ones the team shares. */
export async function listSavedViews(
  resource: ViewResource,
): Promise<ActionResult<SavedViewItem[]>> {
  return runAction(async () => {
    const staff = await requirePermission(viewPermission(resource));
    if (!isDatabaseConfigured) return [];
    const me = actorId(staff);
    const rows = await prisma.savedView.findMany({
      where: { resource, OR: [{ ownerId: me }, { shared: true }] },
      orderBy: [{ shared: "asc" }, { name: "asc" }],
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      query: row.query,
      shared: row.shared,
      mine: row.ownerId === me,
    }));
  });
}

const saveSchema = z.object({
  resource: z.enum(RESOURCES),
  name: z.string().trim().min(1, "Give the view a name.").max(60),
  query: z.string().max(500),
  shared: z.boolean().default(false),
});

/** Keeps the current search, filters and sort as a named view. */
export async function saveView(
  input: z.input<typeof saveSchema>,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const data = parse(saveSchema, input);
    const staff = await requirePermission(viewPermission(data.resource));
    if (data.shared && !can(staff, editPermission(data.resource))) {
      throw new ActionError("Only people who can edit these records can share a view.", "rule");
    }
    // Only list state belongs in a view: never the page number.
    const params = new URLSearchParams(data.query);
    params.delete("page");
    const query = params.toString();
    if (!query) {
      throw new ActionError("Search or filter the list first, then save it as a view.", "rule");
    }

    const me = actorId(staff);
    const count = await prisma.savedView.count({ where: { resource: data.resource, ownerId: me } });
    if (count >= 30) throw new ActionError("You have 30 saved views. Delete one first.", "rule");
    const view = await prisma.savedView.create({
      data: { resource: data.resource, name: data.name, query, shared: data.shared, ownerId: me },
    });
    return { id: view.id };
  });
}

export async function deleteView(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const view = await prisma.savedView.findUnique({ where: { id } });
    if (!view) throw new ActionError("That view no longer exists.");
    const staff = await requirePermission(viewPermission(view.resource as ViewResource));
    const own = view.ownerId !== null && view.ownerId === actorId(staff);
    if (!own && !can(staff, "users:update")) {
      throw new ActionError("You can only delete your own views.", "rule");
    }
    await prisma.$transaction(async (tx) => {
      await tx.savedView.delete({ where: { id } });
      if (view.shared) {
        await recordAudit(
          staff,
          {
            action: "view.delete",
            entity: "saved_view",
            entityId: id,
            summary: `Deleted the shared view "${view.name}"`,
          },
          tx,
        );
      }
    });
  });
}
