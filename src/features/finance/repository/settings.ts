import "server-only";

import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import type { RateSources } from "../rules/billing";
import { DEFAULT_SETTINGS, type FinanceSettingsView } from "../rules/settings";

/** The business's finance settings (the single row), or the starting ones when there is no database. */
export async function getFinanceSettings(): Promise<FinanceSettingsView> {
  if (!isDatabaseConfigured) return DEFAULT_SETTINGS;
  const row = await prisma.financeSettings.findUnique({ where: { id: 1 } }).catch(() => null);
  if (!row) return DEFAULT_SETTINGS;
  return {
    vatRegistered: row.vatRegistered,
    vatRatePct: row.vatRatePct,
    paymentTermsDays: row.paymentTermsDays,
    paymentInstructions: row.paymentInstructions ?? "",
    defaultHourlyRateMinor:
      row.defaultHourlyRateMinor === null ? null : Number(row.defaultHourlyRateMinor),
  };
}

export interface BillingRateView {
  id: string;
  profileId?: string;
  personName?: string;
  projectId?: string;
  projectName?: string;
  hourlyRateMinor: number;
}

export async function listBillingRates(): Promise<BillingRateView[]> {
  if (!isDatabaseConfigured) return [];
  const rows = await prisma.billingRate.findMany({
    include: {
      profile: { select: { fullName: true, email: true } },
      project: { select: { name: true } },
    },
    orderBy: [{ project: { name: "asc" } }, { profile: { fullName: "asc" } }],
  });
  return rows.map((row) => ({
    id: row.id,
    profileId: row.profileId ?? undefined,
    personName: row.profile ? (row.profile.fullName ?? row.profile.email) : undefined,
    projectId: row.projectId ?? undefined,
    projectName: row.project?.name,
    hourlyRateMinor: Number(row.hourlyRateMinor),
  }));
}

/**
 * The rates that could apply to each person's time on a project, ready for `resolveRate`: read from
 * the database (or the transaction the caller is in).
 */
export function rateSourcesFor(
  rates: readonly BillingRateView[],
  defaultRateMinor: number | null,
  projectId: string,
  profileId: string,
): RateSources {
  const find = (person: boolean, project: boolean) =>
    rates.find(
      (rate) =>
        (person ? rate.profileId === profileId : !rate.profileId) &&
        (project ? rate.projectId === projectId : !rate.projectId),
    )?.hourlyRateMinor;
  return {
    personOnProject: find(true, true),
    project: find(false, true),
    person: find(true, false),
    default: defaultRateMinor,
  };
}

/** Staff and projects a billing rate can be set for. */
export async function listRateChoices(): Promise<{
  people: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}> {
  if (!isDatabaseConfigured) return { people: [], projects: [] };
  const [people, projects] = await Promise.all([
    prisma.profile.findMany({
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    people: people.map((person) => ({ id: person.id, name: person.fullName ?? person.email })),
    projects,
  };
}
