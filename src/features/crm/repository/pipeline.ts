import "server-only";

import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { DEFAULT_CURRENCY, weightedMinor } from "@/lib/money";
import { fromManila, manilaDate } from "@/features/schedule/slots";
import { live, toStage } from "../mappers";
import type { ForecastView, PersonRef, PipelineView, StageView } from "../types";

/** The stages of one pipeline (the default one when none is named), in order. */
export async function listStages(pipelineId?: string): Promise<StageView[]> {
  if (!isDatabaseConfigured) return [];
  const stages = await prisma.pipelineStage.findMany({
    where: pipelineId ? { pipelineId } : { pipeline: { isDefault: true } },
    orderBy: { position: "asc" },
  });
  return stages.map(toStage);
}

/** Every pipeline with its stages and how many live deals it holds. Default first. */
export async function listPipelines(): Promise<PipelineView[]> {
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

/** Staff who can own records, for pickers. */
export async function listStaffOptions(): Promise<PersonRef[]> {
  if (!isDatabaseConfigured) return [];
  const people = await prisma.profile.findMany({
    orderBy: [{ fullName: "asc" }, { email: "asc" }],
    select: { id: true, fullName: true, email: true, avatarUrl: true },
  });
  return people.map((person) => ({
    id: person.id,
    name: person.fullName || person.email,
    avatarUrl: person.avatarUrl ?? undefined,
  }));
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
