import "server-only";

import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { DEFAULT_CURRENCY, weightedMinor } from "@/lib/money";
import { fromManila, manilaDate } from "@/features/schedule/slots";
import { live, staffDirectory, toStage } from "../mappers";
import { ttlCache } from "@/lib/ttl-cache";
import type { ForecastView, PersonRef, PipelineView, StageView } from "../types";

/** The stages of one pipeline (the default one when none is named), in order. */
export async function listStages(pipelineId?: string): Promise<StageView[]> {
  if (!isDatabaseConfigured) return [];
  const pipelines = await listPipelines();
  const pipeline = pipelineId
    ? pipelines.find((item) => item.id === pipelineId)
    : pipelines.find((item) => item.isDefault);
  return pipeline?.stages ?? [];
}

/** Every pipeline with its stages and how many live deals it holds. Default first. Kept for 30 seconds; the editor clears it. */
async function loadPipelines(): Promise<PipelineView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.pipeline.findMany({
    orderBy: [{ isDefault: "desc" }, { position: "asc" }, { name: "asc" }],
    include: { stages: { orderBy: { position: "asc" } } },
  });
  const counts = await prisma.deal.groupBy({
    by: ["stageId"],
    where: live,
    _count: { _all: true },
  });
  const byStage = new Map(counts.map((row) => [row.stageId, row._count._all]));
  return rows.map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    isDefault: row.isDefault,
    stages: row.stages.map(toStage),
    dealCount: row.stages.reduce((sum, stage) => sum + (byStage.get(stage.id) ?? 0), 0),
  }));
}

export const listPipelines = ttlCache(30_000, loadPipelines);

/** Staff who can own records, for pickers. */
export async function listStaffOptions(): Promise<PersonRef[]> {
  if (!isDatabaseConfigured) return [];
  return staffDirectory();
}

/**
 * Pipeline totals. Open value and the probability-weighted forecast cover every
 * open deal; "this month" figures use the closing timestamps. Mixed currencies
 * are not converted, so only the default currency is totalled.
 */
export async function getForecast(now: Date = new Date()): Promise<ForecastView> {
  const empty: ForecastView = {
    openCount: 0,
    openValueMinor: 0,
    weightedMinor: 0,
    wonThisMonthMinor: 0,
    wonThisMonthCount: 0,
    lostThisMonthCount: 0,
    currency: DEFAULT_CURRENCY,
    byStage: [],
  };
  if (!isDatabaseConfigured) return empty;

  // "This month" starts at midnight on the 1st in the Philippines, whatever time zone the server is in.
  const monthStart = fromManila(`${manilaDate(now).slice(0, 8)}01`, "00:00");
  const [stages, openDeals, wonDeals, lostCount] = await Promise.all([
    prisma.pipelineStage.findMany({
      where: { kind: "open", pipeline: { isDefault: true } },
      orderBy: { position: "asc" },
    }),
    prisma.deal.findMany({
      where: { ...live, currency: DEFAULT_CURRENCY, stage: { kind: "open" } },
      select: { stageId: true, amountMinor: true, stage: { select: { probability: true } } },
    }),
    prisma.deal.findMany({
      where: { ...live, currency: DEFAULT_CURRENCY, wonAt: { gte: monthStart } },
      select: { amountMinor: true },
    }),
    prisma.deal.count({ where: { ...live, lostAt: { gte: monthStart } } }),
  ]);

  const items = openDeals.map((deal) => ({
    amountMinor: deal.amountMinor === null ? null : Number(deal.amountMinor),
    probability: deal.stage.probability,
  }));

  return {
    ...empty,
    openCount: openDeals.length,
    openValueMinor: items.reduce((sum, item) => sum + (item.amountMinor ?? 0), 0),
    weightedMinor: weightedMinor(items),
    wonThisMonthMinor: wonDeals.reduce((sum, deal) => sum + Number(deal.amountMinor ?? 0), 0),
    wonThisMonthCount: wonDeals.length,
    lostThisMonthCount: lostCount,
    byStage: stages.map((stage) => {
      const inStage = openDeals.filter((deal) => deal.stageId === stage.id);
      return {
        stageId: stage.id,
        name: stage.name,
        count: inStage.length,
        valueMinor: inStage.reduce((sum, deal) => sum + Number(deal.amountMinor ?? 0), 0),
      };
    }),
  };
}
