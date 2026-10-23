/** Rules for editing pipelines and their stages. Pure: shared by the actions and the editor, and unit tested. */

import type { StageKind } from "./rules";

export const MAX_PIPELINES = 8;
export const MAX_OPEN_STAGES = 12;

/** "Follow up!" -> "follow-up": the stable name a stage or pipeline goes by in addresses. */
export function slugKey(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30)
      .replace(/-+$/g, "") || "stage"
  );
}

/** `base`, or `base-2`, `base-3`... the first one that is not taken. */
export function uniqueKey(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

export interface StageLike {
  id: string;
  kind: StageKind;
}

/** Open stages in their order, then Won, then Lost: how positions are numbered. */
export function orderedIds(stages: readonly StageLike[]): string[] {
  const rank = { open: 0, won: 1, lost: 2 } as const;
  return stages
    .map((stage, index) => ({ stage, index }))
    .sort((a, b) => rank[a.stage.kind] - rank[b.stage.kind] || a.index - b.index)
    .map(({ stage }) => stage.id);
}

/** Moves one open stage up or down among the open stages. Returns the new order of every id. */
export function moveWithin(
  stages: readonly StageLike[],
  id: string,
  direction: "up" | "down",
): string[] | null {
  const open = stages.filter((stage) => stage.kind === "open").map((stage) => stage.id);
  const from = open.indexOf(id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= open.length) return null;
  [open[from], open[to]] = [open[to], open[from]];
  const rest = stages.filter((stage) => stage.kind !== "open");
  return [...open, ...orderedIds(rest)];
}

export function checkDeleteStage(
  stage: { kind: StageKind; dealCount: number },
  openStages: number,
): string | null {
  if (stage.kind !== "open") return "Every pipeline needs its Won and Lost stages.";
  if (stage.dealCount > 0) {
    return `${stage.dealCount} ${stage.dealCount === 1 ? "deal is" : "deals are"} in this stage. Move ${stage.dealCount === 1 ? "it" : "them"} first.`;
  }
  if (openStages <= 1) return "A pipeline needs at least one open stage.";
  return null;
}

export function checkDeletePipeline(pipeline: {
  isDefault: boolean;
  dealCount: number;
}): string | null {
  if (pipeline.isDefault)
    return "The default pipeline can't be deleted. Make another one the default first.";
  if (pipeline.dealCount > 0) {
    return `${pipeline.dealCount} ${pipeline.dealCount === 1 ? "deal is" : "deals are"} in this pipeline. Move or delete ${pipeline.dealCount === 1 ? "it" : "them"} first.`;
  }
  return null;
}

export function checkAddStage(openStages: number): string | null {
  return openStages >= MAX_OPEN_STAGES
    ? `A pipeline can have at most ${MAX_OPEN_STAGES} open stages.`
    : null;
}

/** The stages a new pipeline starts with. */
export const STARTER_STAGES = [
  { name: "New", slug: "new", probability: 10, kind: "open", exitCriteria: "Someone has replied" },
  {
    name: "Qualified",
    slug: "qualified",
    probability: 30,
    kind: "open",
    exitCriteria: "Needs and budget are confirmed",
  },
  {
    name: "Proposal",
    slug: "proposal",
    probability: 60,
    kind: "open",
    exitCriteria: "An offer has been sent",
  },
  { name: "Won", slug: "won", probability: 100, kind: "won" },
  { name: "Lost", slug: "lost", probability: 0, kind: "lost" },
] as const;

/** The built-in deal fields a stage can ask for, and what people call them. */
export const STAGE_FIELDS = [
  { key: "value", label: "Value" },
  { key: "expected_close", label: "Expected close date" },
  { key: "organization", label: "Organization" },
] as const;

const CUSTOM_PREFIX = "custom:";
export const customStageField = (key: string) => `${CUSTOM_PREFIX}${key}`;

export interface StageFieldChoice {
  /** What is stored on the stage. */
  token: string;
  label: string;
}

/** Every field a stage can require: the built-in ones, then the deal's active custom fields. */
export function stageFieldChoices(
  customFields: readonly { key: string; label: string; type: string; active: boolean }[],
): StageFieldChoice[] {
  return [
    ...STAGE_FIELDS.map((field) => ({ token: field.key, label: field.label })),
    ...customFields
      .filter((field) => field.active && field.type !== "checkbox")
      .map((field) => ({ token: customStageField(field.key), label: field.label })),
  ];
}

/** What was ticked, cleaned to fields that exist (so a stale or made-up token is dropped), in order. */
export function normalizeRequiredFields(
  tokens: readonly string[],
  choices: readonly StageFieldChoice[],
): string[] {
  const allowed = choices.map((choice) => choice.token);
  return allowed.filter((token) => tokens.includes(token));
}

export interface DealFacts {
  amountMinor: number | null;
  hasExpectedClose: boolean;
  hasOrganization: boolean;
  /** The deal's custom values, by field key. */
  custom: Record<string, unknown>;
}

/** The labels of the fields this deal is still missing for a stage (archived custom fields are skipped). */
export function missingStageFields(
  required: readonly string[],
  deal: DealFacts,
  choices: readonly StageFieldChoice[],
): string[] {
  const label = (token: string) => choices.find((choice) => choice.token === token)?.label;
  const missing: string[] = [];
  for (const token of required) {
    const name = label(token);
    if (!name) continue;
    const filled =
      token === "value"
        ? deal.amountMinor !== null && deal.amountMinor > 0
        : token === "expected_close"
          ? deal.hasExpectedClose
          : token === "organization"
            ? deal.hasOrganization
            : deal.custom[token.slice(CUSTOM_PREFIX.length)] !== undefined;
    if (!filled) missing.push(name);
  }
  return missing;
}

/** Why a deal can't enter a stage yet, or null. */
export function checkStageRequirements(
  stageName: string,
  missing: readonly string[],
): string | null {
  return missing.length === 0
    ? null
    : `To move to ${stageName}, fill in: ${missing.join(", ")}. Open the deal to add ${missing.length === 1 ? "it" : "them"}.`;
}
