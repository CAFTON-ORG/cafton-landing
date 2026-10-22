"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { live } from "../mappers";
import {
  MAX_PIPELINES,
  STARTER_STAGES,
  checkAddStage,
  checkDeletePipeline,
  checkDeleteStage,
  moveWithin,
  orderedIds,
  slugKey,
  uniqueKey,
} from "../pipelines";
import { guard, refreshCrm } from "./guard";
import type { Tx } from "./shared";

const name = z.string().trim().min(1, "Give it a name.").max(60);
const probability = z.coerce.number().int().min(0, "0 to 100.").max(100, "0 to 100.");
const criteria = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => value || undefined);

function refresh() {
  refreshCrm();
  revalidatePath("/dashboard/crm/pipelines");
}

/** Renumbers a pipeline's stages 1..n in the given order. */
async function renumber(tx: Tx, ids: string[]) {
  for (const [index, id] of ids.entries()) {
    await tx.pipelineStage.update({ where: { id }, data: { position: index + 1 } });
  }
}

async function takenKeys(tx: Tx, table: "pipeline" | "stage") {
  const rows =
    table === "pipeline"
      ? await tx.pipeline.findMany({ select: { key: true } })
      : await tx.pipelineStage.findMany({ select: { key: true } });
  return new Set(rows.map((row) => row.key));
}

export async function createPipeline(input: {
  name: string;
}): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("pipelines:manage");
    const data = parse(z.object({ name }), input);
    const id = await prisma.$transaction(async (tx) => {
      if ((await tx.pipeline.count()) >= MAX_PIPELINES) {
        throw new ActionError(`You can have at most ${MAX_PIPELINES} pipelines.`, "rule");
      }
      const key = uniqueKey(slugKey(data.name), await takenKeys(tx, "pipeline"));
      const last = await tx.pipeline.aggregate({ _max: { position: true } });
      const pipeline = await tx.pipeline.create({
        data: { key, name: data.name, position: (last._max.position ?? 0) + 1 },
      });
      const taken = await takenKeys(tx, "stage");
      for (const [index, stage] of STARTER_STAGES.entries()) {
        const stageKey = uniqueKey(`${key}-${stage.slug}`, taken);
        taken.add(stageKey);
        await tx.pipelineStage.create({
          data: {
            pipelineId: pipeline.id,
            key: stageKey,
            name: stage.name,
            position: index + 1,
            probability: stage.probability,
            kind: stage.kind,
            exitCriteria: "exitCriteria" in stage ? stage.exitCriteria : undefined,
          },
        });
      }
      await recordAudit(
        actor,
        {
          action: "pipeline.create",
          entity: "pipeline",
          entityId: pipeline.id,
          summary: `Created the pipeline ${data.name}`,
        },
        tx,
      );
      return pipeline.id;
    });
    refresh();
    return { id };
  });
}

export async function renamePipeline(id: string, newName: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("pipelines:manage");
    const data = parse(z.object({ name }), { name: newName });
    await prisma.$transaction(async (tx) => {
      const pipeline = await tx.pipeline.findUnique({ where: { id } });
      if (!pipeline) throw new ActionError("That pipeline no longer exists.");
      await tx.pipeline.update({ where: { id }, data: { name: data.name } });
      await recordAudit(
        actor,
        {
          action: "pipeline.rename",
          entity: "pipeline",
          entityId: id,
          summary: `Renamed the pipeline ${pipeline.name} to ${data.name}`,
        },
        tx,
      );
    });
    refresh();
  });
}

export async function setDefaultPipeline(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("pipelines:manage");
    await prisma.$transaction(async (tx) => {
      const pipeline = await tx.pipeline.findUnique({ where: { id } });
      if (!pipeline) throw new ActionError("That pipeline no longer exists.");
      await tx.pipeline.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      await tx.pipeline.update({ where: { id }, data: { isDefault: true } });
      await recordAudit(
        actor,
        {
          action: "pipeline.default",
          entity: "pipeline",
          entityId: id,
          summary: `Made ${pipeline.name} the default pipeline`,
        },
        tx,
      );
    });
    refresh();
  });
}

export async function deletePipeline(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("pipelines:manage");
    await prisma.$transaction(async (tx) => {
      const pipeline = await tx.pipeline.findUnique({ where: { id } });
      if (!pipeline) throw new ActionError("That pipeline no longer exists.");
      const dealCount = await tx.deal.count({ where: { stage: { pipelineId: id } } });
      const blocked = checkDeletePipeline({ isDefault: pipeline.isDefault, dealCount });
      if (blocked) throw new ActionError(blocked, "rule");
      await tx.pipeline.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "pipeline.delete",
          entity: "pipeline",
          entityId: id,
          summary: `Deleted the pipeline ${pipeline.name}`,
        },
        tx,
      );
    });
    refresh();
  });
}

const addStageSchema = z.object({
  pipelineId: z.string().uuid(),
  name,
  probability,
  exitCriteria: criteria,
});

/** Adds an open stage just before Won. */
export async function addStage(input: z.input<typeof addStageSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("pipelines:manage");
    const data = parse(addStageSchema, input);
    await prisma.$transaction(async (tx) => {
      const pipeline = await tx.pipeline.findUnique({
        where: { id: data.pipelineId },
        include: { stages: { orderBy: { position: "asc" } } },
      });
      if (!pipeline) throw new ActionError("That pipeline no longer exists.");
      const blocked = checkAddStage(pipeline.stages.filter((s) => s.kind === "open").length);
      if (blocked) throw new ActionError(blocked, "rule");
      const key = uniqueKey(`${pipeline.key}-${slugKey(data.name)}`, await takenKeys(tx, "stage"));
      const stage = await tx.pipelineStage.create({
        data: {
          pipelineId: pipeline.id,
          key,
          name: data.name,
          position: 1000,
          probability: data.probability,
          kind: "open",
          exitCriteria: data.exitCriteria,
        },
      });
      await renumber(tx, orderedIds([...pipeline.stages, stage]));
      await recordAudit(
        actor,
        {
          action: "stage.create",
          entity: "pipeline_stage",
          entityId: stage.id,
          summary: `Added the stage ${data.name} to ${pipeline.name}`,
        },
        tx,
      );
    });
    refresh();
  });
}

const updateStageSchema = z.object({
  id: z.string().uuid(),
  name,
  probability,
  exitCriteria: criteria,
});

export async function updateStage(input: z.input<typeof updateStageSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("pipelines:manage");
    const data = parse(updateStageSchema, input);
    await prisma.$transaction(async (tx) => {
      const stage = await tx.pipelineStage.findUnique({ where: { id: data.id } });
      if (!stage) throw new ActionError("That stage no longer exists.");
      // Won is always 100 and Lost 0: the forecast depends on it.
      const fixed = stage.kind !== "open";
      await tx.pipelineStage.update({
        where: { id: data.id },
        data: {
          name: data.name,
          probability: fixed ? stage.probability : data.probability,
          exitCriteria: fixed ? stage.exitCriteria : (data.exitCriteria ?? null),
        },
      });
      await recordAudit(
        actor,
        {
          action: "stage.update",
          entity: "pipeline_stage",
          entityId: data.id,
          summary: `Edited the stage ${stage.name}`,
        },
        tx,
      );
    });
    refresh();
  });
}

export async function moveStage(id: string, direction: "up" | "down"): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("pipelines:manage");
    await prisma.$transaction(async (tx) => {
      const stage = await tx.pipelineStage.findUnique({ where: { id } });
      if (!stage) throw new ActionError("That stage no longer exists.");
      const siblings = await tx.pipelineStage.findMany({
        where: { pipelineId: stage.pipelineId },
        orderBy: { position: "asc" },
      });
      const order = moveWithin(siblings, id, direction);
      if (!order) return;
      await renumber(tx, order);
      await recordAudit(
        actor,
        {
          action: "stage.move",
          entity: "pipeline_stage",
          entityId: id,
          summary: `Moved the stage ${stage.name} ${direction}`,
        },
        tx,
      );
    });
    refresh();
  });
}

export async function deleteStage(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("pipelines:manage");
    await prisma.$transaction(async (tx) => {
      const stage = await tx.pipelineStage.findUnique({ where: { id } });
      if (!stage) throw new ActionError("That stage no longer exists.");
      const [dealCount, openStages] = await Promise.all([
        tx.deal.count({ where: { stageId: id, ...live } }),
        tx.pipelineStage.count({ where: { pipelineId: stage.pipelineId, kind: "open" } }),
      ]);
      // Soft-deleted deals still point at the stage, so count every row, not just live ones.
      const anyDeal = await tx.deal.count({ where: { stageId: id } });
      const blocked = checkDeleteStage(
        { kind: stage.kind, dealCount: Math.max(dealCount, anyDeal) },
        openStages,
      );
      if (blocked) throw new ActionError(blocked, "rule");
      await tx.pipelineStage.delete({ where: { id } });
      const rest = await tx.pipelineStage.findMany({
        where: { pipelineId: stage.pipelineId },
        orderBy: { position: "asc" },
      });
      await renumber(tx, orderedIds(rest));
      await recordAudit(
        actor,
        {
          action: "stage.delete",
          entity: "pipeline_stage",
          entityId: id,
          summary: `Deleted the stage ${stage.name}`,
        },
        tx,
      );
    });
    refresh();
  });
}
