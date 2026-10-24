/**
 * The headline numbers above the deals board, as one pure function so they can be tested:
 * what is still open, what it is worth, what it is worth weighted by each stage's win chance,
 * how many have nothing planned, and how many are past their expected close date.
 * Only open deals count; deals in a closed stage are ignored. Values are integer centavos.
 */
export interface StatDeal {
  stageId: string;
  stageKind: "open" | "won" | "lost";
  amountMinor: number | null;
  expectedCloseDate?: string;
  nextActivityAt?: string;
}

export interface StatStage {
  id: string;
  probability: number;
}

export interface PipelineStats {
  count: number;
  valueMinor: number;
  weightedMinor: number;
  /** Open deals with no task or meeting planned. */
  withoutNextStep: number;
  /** Open deals whose expected close date is before `today` (a "YYYY-MM-DD" date). */
  pastCloseDate: number;
}

export function pipelineStats(
  stages: readonly StatStage[],
  deals: readonly StatDeal[],
  today: string,
): PipelineStats {
  const chance = new Map(stages.map((stage) => [stage.id, stage.probability]));
  let valueMinor = 0;
  let weighted = 0;
  let count = 0;
  let withoutNextStep = 0;
  let pastCloseDate = 0;
  for (const deal of deals) {
    if (deal.stageKind !== "open") continue;
    count += 1;
    const amount = deal.amountMinor ?? 0;
    valueMinor += amount;
    weighted += (amount * (chance.get(deal.stageId) ?? 0)) / 100;
    if (!deal.nextActivityAt) withoutNextStep += 1;
    if (deal.expectedCloseDate && deal.expectedCloseDate < today) pastCloseDate += 1;
  }
  return { count, valueMinor, weightedMinor: Math.round(weighted), withoutNextStep, pastCloseDate };
}
