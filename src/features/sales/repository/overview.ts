import "server-only";

import { namesFor } from "@/features/crm/repository/mappers";
import { listStaffOptions } from "@/features/crm/repository/pipeline";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { isMonth, monthOf, monthRange, salesMetrics, type SalesMetrics } from "../rules/dashboard";
import { openQuoteTotals } from "./sales";

export interface OverviewOwner {
  ownerId: string | null;
  name: string;
  avatarUrl?: string;
  openCount: number;
  openMinor: number;
  weightedMinor: number;
  wonMinor: number;
  wonCount: number;
  targetMinor: number | null;
  attainmentPct: number | null;
}

export interface SalesOverview extends Omit<SalesMetrics, "owners"> {
  month: SalesMetrics["month"] & { key: string };
  owners: OverviewOwner[];
  quotes: { out: number; outMinor: number; waitingForApproval: number; acceptedMinor: number };
}

const WINDOW_DAYS = 90;

/** The numbers behind the sales overview for one month (default: this month, Manila time). */
export async function getSalesOverview(
  requested?: string,
  now: Date = new Date(),
): Promise<SalesOverview> {
  const month = isMonth(requested) ? requested : monthOf(now);
  const empty = salesMetrics([], new Map(), { month, now });
  if (!isDatabaseConfigured) {
    return {
      ...empty,
      month: { ...empty.month, key: month },
      owners: [],
      quotes: { out: 0, outMinor: 0, waitingForApproval: 0, acceptedMinor: 0 },
    };
  }

  const { start, end } = monthRange(month);
  const since = new Date(now.getTime() - WINDOW_DAYS * 86_400_000);
  const [deals, targets, staff, totals, accepted] = await Promise.all([
    prisma.deal.findMany({
      where: {
        deletedAt: null,
        OR: [
          { stage: { kind: "open" } },
          { wonAt: { gte: since < start ? since : start, lt: now > end ? now : end } },
          { lostAt: { gte: since } },
        ],
      },
      select: {
        ownerId: true,
        amountMinor: true,
        createdAt: true,
        wonAt: true,
        lostAt: true,
        stage: { select: { kind: true, probability: true } },
      },
    }),
    prisma.salesTarget.findMany({ where: { month: new Date(`${month}-01`) } }),
    listStaffOptions(),
    openQuoteTotals(),
    prisma.quote.aggregate({
      where: { status: "accepted", acceptedAt: { gte: start, lt: end } },
      _sum: { acceptedTotalMinor: true },
    }),
  ]);

  const targetMap = new Map(targets.map((target) => [target.ownerId, Number(target.amountMinor)]));
  const metrics = salesMetrics(
    deals.map((deal) => ({
      ownerId: deal.ownerId,
      stageKind: deal.stage.kind as "open" | "won" | "lost",
      probability: deal.stage.probability,
      amountMinor: deal.amountMinor === null ? null : Number(deal.amountMinor),
      createdAt: deal.createdAt,
      wonAt: deal.wonAt,
      lostAt: deal.lostAt,
    })),
    targetMap,
    { month, now, windowDays: WINDOW_DAYS },
  );

  const people = new Map(staff.map((person) => [person.id, person]));
  const missing = await namesFor(
    metrics.owners.filter((o) => o.ownerId && !people.has(o.ownerId)).map((o) => o.ownerId),
  );
  // Everyone on the team is listed so a target can be set for them, even with no deals yet.
  const byOwner = new Map(metrics.owners.map((owner) => [owner.ownerId, owner]));
  const rows: OverviewOwner[] = [];
  for (const person of staff) {
    const found = byOwner.get(person.id);
    rows.push({
      ownerId: person.id,
      name: person.name,
      avatarUrl: person.avatarUrl,
      openCount: found?.openCount ?? 0,
      openMinor: found?.openMinor ?? 0,
      weightedMinor: found?.weightedMinor ?? 0,
      wonMinor: found?.wonMinor ?? 0,
      wonCount: found?.wonCount ?? 0,
      targetMinor: found?.targetMinor ?? null,
      attainmentPct: found?.attainmentPct ?? null,
    });
    byOwner.delete(person.id);
  }
  for (const owner of byOwner.values()) {
    const who = owner.ownerId ? missing.get(owner.ownerId) : undefined;
    rows.push({
      ...owner,
      name: owner.ownerId ? (who?.name ?? "Former team member") : "Unassigned",
      avatarUrl: who?.avatarUrl,
    });
  }
  rows.sort((a, b) => {
    if (a.ownerId === null) return 1;
    if (b.ownerId === null) return -1;
    return b.openMinor + b.wonMinor - (a.openMinor + a.wonMinor) || a.name.localeCompare(b.name);
  });

  return {
    ...metrics,
    month: { ...metrics.month, key: month },
    owners: rows,
    quotes: { ...totals, acceptedMinor: Number(accepted._sum.acceptedTotalMinor ?? 0) },
  };
}
