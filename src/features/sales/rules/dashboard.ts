/**
 * The numbers on the sales overview, as pure functions so they can be tested without a database.
 * Money is integer centavos. A "month" is a calendar month in Manila time ("2026-11"), because
 * that is when the team thinks a month starts and ends.
 */

export interface MetricDeal {
  ownerId: string | null;
  stageKind: "open" | "won" | "lost";
  /** The chance of winning at the deal's stage, 0 to 100. */
  probability: number;
  amountMinor: number | null;
  createdAt: Date;
  wonAt: Date | null;
  lostAt: Date | null;
}

export interface OwnerMetrics {
  ownerId: string | null;
  openCount: number;
  openMinor: number;
  weightedMinor: number;
  /** Won in the chosen month. */
  wonMinor: number;
  wonCount: number;
  targetMinor: number | null;
  /** Percent of the month's target reached, or null when there is no target. */
  attainmentPct: number | null;
}

export interface SalesMetrics {
  open: { count: number; valueMinor: number; weightedMinor: number };
  /** Deals decided in the trailing window. */
  decided: {
    won: number;
    lost: number;
    wonMinor: number;
    /** Won / (won + lost), in percent; null until something has been decided. */
    winRatePct: number | null;
    /** Average days from creation to won; null with no wins. */
    cycleDays: number | null;
  };
  month: { wonMinor: number; wonCount: number; targetMinor: number; attainmentPct: number | null };
  owners: OwnerMetrics[];
}

const DAY = 86_400_000;

/** "2026-11" for a moment, read in Manila time (UTC+8, no daylight saving). */
export function monthOf(moment: Date): string {
  return new Date(moment.getTime() + 8 * 3_600_000).toISOString().slice(0, 7);
}

export const isMonth = (value: string | undefined): value is string =>
  !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** The moments a Manila month starts and ends (end exclusive). */
export function monthRange(month: string): { start: Date; end: Date } {
  const start = new Date(`${month}-01T00:00:00+08:00`);
  const [year, number] = month.split("-").map(Number);
  const next = number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, "0")}`;
  return { start, end: new Date(`${next}-01T00:00:00+08:00`) };
}

export function shiftMonth(month: string, by: number): string {
  const [year, number] = month.split("-").map(Number);
  const index = year * 12 + (number - 1) + by;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export function winRatePct(won: number, lost: number): number | null {
  const decided = won + lost;
  return decided === 0 ? null : Math.round((won / decided) * 100);
}

export function attainmentPct(wonMinor: number, targetMinor: number | null): number | null {
  if (!targetMinor || targetMinor <= 0) return null;
  return Math.round((wonMinor / targetMinor) * 100);
}

export function salesMetrics(
  deals: readonly MetricDeal[],
  targets: ReadonlyMap<string, number>,
  options: { month: string; now: Date; windowDays?: number },
): SalesMetrics {
  const { start, end } = monthRange(options.month);
  const since = new Date(options.now.getTime() - (options.windowDays ?? 90) * DAY);

  const open = { count: 0, valueMinor: 0, weightedMinor: 0 };
  let won = 0;
  let lost = 0;
  let wonMinor = 0;
  let cycleTotal = 0;
  const owners = new Map<string | null, OwnerMetrics>();
  const row = (ownerId: string | null) => {
    let found = owners.get(ownerId);
    if (!found) {
      const target = ownerId ? (targets.get(ownerId) ?? null) : null;
      found = {
        ownerId,
        openCount: 0,
        openMinor: 0,
        weightedMinor: 0,
        wonMinor: 0,
        wonCount: 0,
        targetMinor: target,
        attainmentPct: null,
      };
      owners.set(ownerId, found);
    }
    return found;
  };
  // People with a target show up even if they have no deals yet.
  for (const ownerId of targets.keys()) row(ownerId);

  let monthWon = 0;
  let monthCount = 0;
  for (const deal of deals) {
    const amount = deal.amountMinor ?? 0;
    const owner = row(deal.ownerId);
    if (deal.stageKind === "open") {
      const weighted = (amount * deal.probability) / 100;
      open.count += 1;
      open.valueMinor += amount;
      open.weightedMinor += weighted;
      owner.openCount += 1;
      owner.openMinor += amount;
      owner.weightedMinor += weighted;
    } else if (deal.stageKind === "won" && deal.wonAt) {
      if (deal.wonAt >= since) {
        won += 1;
        wonMinor += amount;
        cycleTotal += Math.max(0, (deal.wonAt.getTime() - deal.createdAt.getTime()) / DAY);
      }
      if (deal.wonAt >= start && deal.wonAt < end) {
        monthWon += amount;
        monthCount += 1;
        owner.wonMinor += amount;
        owner.wonCount += 1;
      }
    } else if (deal.stageKind === "lost" && deal.lostAt && deal.lostAt >= since) {
      lost += 1;
    }
  }

  const targetTotal = [...targets.values()].reduce((sum, value) => sum + value, 0);
  const rows = [...owners.values()].map((owner) => ({
    ...owner,
    weightedMinor: Math.round(owner.weightedMinor),
    attainmentPct: attainmentPct(owner.wonMinor, owner.targetMinor),
  }));
  // Biggest first; unassigned deals last.
  rows.sort((a, b) =>
    a.ownerId === null
      ? 1
      : b.ownerId === null
        ? -1
        : b.openMinor + b.wonMinor - (a.openMinor + a.wonMinor),
  );

  return {
    open: { ...open, weightedMinor: Math.round(open.weightedMinor) },
    decided: {
      won,
      lost,
      wonMinor,
      winRatePct: winRatePct(won, lost),
      cycleDays: won === 0 ? null : Math.round((cycleTotal / won) * 10) / 10,
    },
    month: {
      wonMinor: monthWon,
      wonCount: monthCount,
      targetMinor: targetTotal,
      attainmentPct: attainmentPct(monthWon, targetTotal),
    },
    owners: rows,
  };
}
