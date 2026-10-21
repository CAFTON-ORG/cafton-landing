import "server-only";

import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { DEFAULT_CURRENCY, weightedMinor } from "@/lib/money";
import { live, toStage } from "../mappers";
import type { ForecastView, PersonRef, StageView } from "../types";

export async function listStages(): Promise<StageView[]> {
  if (!isDatabaseConfigured) return [];
  const stages = await prisma.pipelineStage.findMany({ orderBy: { position: "asc" } });
  return stages.map(toStage);
}

/** Staff who can own records, for pickers. */
export async function listStaffOptions(): Promise<PersonRef[]> {
  if (!isDatabaseConfigured) return [];
  const people = await prisma.profile.findMany({
    orderBy: [{ fullName: "asc" }, { email: "asc" }],
    select: { id: true, fullName: true, email: true },
  });
  return people.map((person) => ({ id: person.id, name: person.fullName || person.email }));
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

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [stages, openDeals, wonDeals, lostCount] = await Promise.all([
    prisma.pipelineStage.findMany({ where: { kind: "open" }, orderBy: { position: "asc" } }),
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
