"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { guard } from "@/features/crm/actions/guard";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { parseMinor } from "@/lib/money";
import { checkRate } from "../billing";
import { checkSettings } from "../settings";

const settingsSchema = z.object({
  vatRegistered: z.boolean(),
  vatRatePct: z.coerce.number().int(),
  paymentTermsDays: z.coerce.number().int(),
  paymentInstructions: z.string().trim().max(2000).default(""),
  /** Pesos an hour, or empty for no standard rate. */
  defaultHourlyRate: z.string().trim().max(24).default(""),
});
export type SettingsInput = z.input<typeof settingsSchema>;

const rateSchema = z.object({
  /** Present when changing a rate. */
  id: z.string().uuid().optional(),
  profileId: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (!value || value === "none" ? null : value))
    .pipe(z.string().uuid().nullable()),
  projectId: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (!value || value === "none" ? null : value))
    .pipe(z.string().uuid().nullable()),
  /** Pesos an hour. */
  rate: z.string().trim().max(24),
});
export type RateInput = z.input<typeof rateSchema>;

function refresh() {
  revalidatePath("/dashboard/finance/settings");
  revalidatePath("/dashboard/finance/invoices");
  revalidatePath("/dashboard/sales/quotes");
}

/** What a new quote and a new invoice start with, and the standard hourly rate. */
export async function saveFinanceSettings(input: SettingsInput): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("finance:manage");
    const data = parse(settingsSchema, input);
    const invalid = checkSettings({
      vatRatePct: data.vatRatePct,
      paymentTermsDays: data.paymentTermsDays,
    });
    let rateMinor: number | null = null;
    if (data.defaultHourlyRate.trim()) {
      const parsed = parseMinor(data.defaultHourlyRate);
      const bad = parsed === null ? "Enter an amount like 1500 or 1,500.50." : checkRate(parsed);
      if (bad) throw new ActionError(bad, "validation", { defaultHourlyRate: bad });
      rateMinor = parsed;
    }
    if (invalid) {
      throw new ActionError("Check the marked fields.", "validation", {
        ...(invalid.vatRate ? { vatRatePct: invalid.vatRate } : {}),
        ...(invalid.terms ? { paymentTermsDays: invalid.terms } : {}),
      });
    }
    await prisma.$transaction(async (tx) => {
      const fields = {
        vatRegistered: data.vatRegistered,
        vatRatePct: data.vatRatePct,
        paymentTermsDays: data.paymentTermsDays,
        paymentInstructions: data.paymentInstructions || null,
        defaultHourlyRateMinor: rateMinor,
        updatedBy: actorId(actor),
        updatedAt: new Date(),
      };
      await tx.financeSettings.upsert({
        where: { id: 1 },
        update: fields,
        create: { id: 1, ...fields },
      });
      await recordAudit(
        actor,
        {
          action: "finance.settings",
          entity: "finance_settings",
          entityId: "1",
          summary: `Changed the finance settings (${data.vatRegistered ? "VAT-registered" : "not VAT-registered"})`,
        },
        tx,
      );
    });
    refresh();
  });
}

/** Sets an hourly rate for a person, a project, or a person on a project. One per combination. */
export async function saveBillingRate(input: RateInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("finance:manage");
    const data = parse(rateSchema, input);
    if (!data.profileId && !data.projectId) {
      const message = "Choose a person, a project, or both.";
      throw new ActionError(message, "validation", { profileId: message });
    }
    const parsed = parseMinor(data.rate);
    const bad = parsed === null ? "Enter an amount like 1500 or 1,500.50." : checkRate(parsed);
    if (bad || parsed === null)
      throw new ActionError(bad ?? "Enter a rate.", "validation", { rate: bad ?? "Enter a rate." });

    const id = await prisma.$transaction(async (tx) => {
      const [person, project] = await Promise.all([
        data.profileId
          ? tx.profile.findUnique({
              where: { id: data.profileId },
              select: { fullName: true, email: true },
            })
          : null,
        data.projectId
          ? tx.project.findUnique({ where: { id: data.projectId }, select: { name: true } })
          : null,
      ]);
      if (data.profileId && !person) throw new ActionError("That person no longer exists.");
      if (data.projectId && !project) throw new ActionError("That project no longer exists.");
      const clash = await tx.billingRate.findFirst({
        where: {
          profileId: data.profileId,
          projectId: data.projectId,
          ...(data.id ? { id: { not: data.id } } : {}),
        },
      });
      if (clash) {
        const message = "There is already a rate for that. Change it instead of adding another.";
        throw new ActionError(message, "validation", { rate: message });
      }
      const label = [person ? (person.fullName ?? person.email) : null, project?.name]
        .filter(Boolean)
        .join(" on ");
      const fields = {
        profileId: data.profileId,
        projectId: data.projectId,
        hourlyRateMinor: parsed,
        updatedBy: actorId(actor),
      };
      if (data.id) {
        const found = await tx.billingRate.findUnique({ where: { id: data.id } });
        if (!found) throw new ActionError("That rate no longer exists.");
        await tx.billingRate.update({ where: { id: data.id }, data: fields });
        await recordAudit(
          actor,
          {
            action: "billing_rate.update",
            entity: "billing_rate",
            entityId: data.id,
            summary: `Changed the hourly rate for ${label} to ₱${(parsed / 100).toFixed(2)}`,
          },
          tx,
        );
        return data.id;
      }
      const created = await tx.billingRate.create({ data: fields });
      await recordAudit(
        actor,
        {
          action: "billing_rate.create",
          entity: "billing_rate",
          entityId: created.id,
          summary: `Set the hourly rate for ${label} to ₱${(parsed / 100).toFixed(2)}`,
        },
        tx,
      );
      return created.id;
    });
    refresh();
    return { id };
  });
}

export async function deleteBillingRate(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("finance:manage");
    await prisma.$transaction(async (tx) => {
      const found = await tx.billingRate.findUnique({
        where: { id: parse(z.string().uuid(), id) },
      });
      if (!found) throw new ActionError("That rate no longer exists.");
      await tx.billingRate.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "billing_rate.delete",
          entity: "billing_rate",
          entityId: id,
          summary: "Removed an hourly rate",
        },
        tx,
      );
    });
    refresh();
  });
}
