import "server-only";

import { revalidatePath } from "next/cache";

import { live } from "@/features/crm/mappers";
import { notify, staffIdsWith } from "@/features/notifications/server";
import { on, type DomainEvents } from "@/lib/events";
import { prisma } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";

/**
 * Delivery's reactions to what other parts of the system announce. Sales never imports this: it
 * emits `quote.accepted`, and a project starts here. Each handler is safe to run twice.
 */

/**
 * An accepted quote starts a project: named after the deal, for the same client, priced at the
 * quote's total, managed by whoever owns the deal. Once per quote (the database refuses a second),
 * so a repeated event, or a quote accepted again after a new version, changes nothing.
 */
export async function startProjectFromQuote(event: DomainEvents["quote.accepted"]) {
  if (!isDatabaseConfigured) return;

  const created = await prisma.$transaction(async (tx) => {
    if (await tx.project.findUnique({ where: { quoteId: event.quoteId }, select: { id: true } })) {
      return null;
    }
    const deal = await tx.deal.findFirst({ where: { id: event.dealId, ...live } });
    if (!deal) return null;
    // A deal that already has a project from an earlier quote version is the same piece of work.
    if (await tx.project.findFirst({ where: { dealId: deal.id, ...live }, select: { id: true } })) {
      return null;
    }

    const project = await tx.project.create({
      data: {
        name: deal.title,
        dealId: deal.id,
        quoteId: event.quoteId,
        contactId: deal.contactId,
        organizationId: deal.organizationId,
        managerId: deal.ownerId,
        budgetMinor: event.totalMinor,
        currency: event.currency,
        members: deal.ownerId ? { create: { profileId: deal.ownerId } } : undefined,
      },
    });
    await tx.activity.create({
      data: {
        type: "system",
        body: `Project ${project.reference} was started from quote ${event.reference}`,
        dealId: deal.id,
        createdByName: "System",
      },
    });
    await tx.auditLog.create({
      data: {
        actorName: "System",
        action: "project.create",
        entity: "project",
        entityId: project.id,
        summary: `Started project ${project.reference} ${project.name} from accepted quote ${event.reference}`,
      },
    });
    return { project, ownerId: deal.ownerId };
  });
  if (!created) return;

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/crm/deals/${event.dealId}`);
  // The deal's owner manages it; tell them, and the people who can start it.
  await notify([created.ownerId, ...(await staffIdsWith("projects:create"))], {
    kind: "project",
    title: `Project ${created.project.reference} is ready to plan`,
    body: `${event.acceptedByName} accepted quote ${event.reference}.`,
    href: `/dashboard/projects/${created.project.id}`,
  });
}

on("quote.accepted", startProjectFromQuote);
