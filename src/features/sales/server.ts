import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { logActivity } from "@/features/crm/actions/shared";
import { manilaDate } from "@/features/schedule/slots";
import { actorId } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { fingerprint, type Fingerprinted } from "./integrity";
import { LIVE_STATUSES, stageAfter, type QuoteStatus } from "./rules";

type Tx = Prisma.TransactionClient;
type Actor = { id: string; name: string };

const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

/** The parts of a stored quote that the client agrees to, for its fingerprint. */
export function fingerprintOf(
  quote: Prisma.QuoteGetPayload<object> & { lines: Prisma.QuoteLineGetPayload<object>[] },
): string {
  const content: Fingerprinted = {
    title: quote.title,
    intro: quote.intro,
    terms: quote.terms,
    paymentTerms: quote.paymentTerms,
    depositPct: quote.depositPct,
    validUntil: day(quote.validUntil),
    currency: quote.currency,
    taxRatePct: quote.taxRatePct,
    subtotalMinor: Number(quote.subtotalMinor),
    taxMinor: Number(quote.taxMinor),
    totalMinor: Number(quote.totalMinor),
    lines: quote.lines.map((line) => ({
      position: line.position,
      description: line.description,
      quantityMilli: line.quantityMilli,
      unitLabel: line.unitLabel,
      unitPriceMinor: Number(line.unitPriceMinor),
      discountPct: line.discountPct,
      taxable: line.taxable,
      totalMinor: Number(line.totalMinor),
    })),
  };
  return fingerprint(content);
}

/**
 * Sending a quote moves a deal that is earlier in its pipeline to "Proposal"; accepting moves it on
 * to "Negotiation". A deal already at or past that stage stays where it is.
 */
export async function moveDealAfter(
  tx: Tx,
  actor: Actor,
  dealId: string,
  event: "send" | "accept",
) {
  const deal = await tx.deal.findUnique({ where: { id: dealId }, include: { stage: true } });
  if (!deal) return;
  const stages = await tx.pipelineStage.findMany({
    where: { pipelineId: deal.stage.pipelineId },
    orderBy: { position: "asc" },
  });
  const target = stageAfter(event, deal.stage, stages);
  if (!target) return;
  await tx.deal.update({
    where: { id: dealId },
    data: { stageId: target.id, stageChangedAt: new Date(), updatedBy: actorId(actor) },
  });
  await logActivity(
    tx,
    actor,
    { dealId },
    "stage_change",
    `Moved from ${deal.stage.name} to ${target.name} (quote ${event === "send" ? "sent" : "accepted"})`,
  );
}

/**
 * When a deal is lost, every quote still in play is withdrawn, so a client can't accept an offer
 * for a deal we have closed. Called inside the deal's own transaction.
 */
export async function withdrawLiveQuotes(tx: Tx, actor: Actor, dealId: string, reason: string) {
  const open = await tx.quote.findMany({
    where: { dealId, status: { in: LIVE_STATUSES as QuoteStatus[] } },
    select: { id: true, reference: true, version: true, status: true },
  });
  for (const quote of open) {
    await tx.quote.update({
      where: { id: quote.id },
      data: { status: "withdrawn", withdrawnAt: new Date(), withdrawnReason: reason },
    });
    await recordAudit(
      actor,
      {
        action: "quote.withdraw",
        entity: "quote",
        entityId: quote.id,
        summary: `Withdrew quote ${quote.reference} v${quote.version}: ${reason}`,
      },
      tx,
    );
  }
  return open.length;
}

/** What the deal's accepted quote says it is worth, or null when it has none. */
export async function acceptedTotal(tx: Tx, dealId: string): Promise<number | null> {
  const quote = await tx.quote.findFirst({
    where: { dealId, status: "accepted" },
    orderBy: { acceptedAt: "desc" },
    select: { totalMinor: true },
  });
  return quote ? Number(quote.totalMinor) : null;
}

/** The statuses of a deal's quotes, for the "can it be deleted" rule. */
export async function quoteStatusesFor(tx: Tx, dealId: string): Promise<QuoteStatus[]> {
  const rows = await tx.quote.findMany({ where: { dealId }, select: { status: true } });
  return rows.map((row) => row.status as QuoteStatus);
}

/**
 * Daily job: a sent quote whose date has passed becomes "expired" in the database (it already
 * reads as expired everywhere), and the people who sent it are told.
 */
export async function expireDueQuotes(now = new Date()) {
  const today = manilaDate(now);
  const due = await prisma.quote.findMany({
    where: { status: "sent", validUntil: { lt: new Date(today) } },
    select: {
      id: true,
      reference: true,
      version: true,
      dealId: true,
      createdBy: true,
      deal: { select: { ownerId: true } },
    },
  });
  const { notify } = await import("@/features/notifications/server");
  let expired = 0;
  for (const quote of due) {
    const done = await prisma.quote.updateMany({
      where: { id: quote.id, status: "sent" },
      data: { status: "expired" },
    });
    if (done.count === 0) continue;
    expired += 1;
    await prisma.activity.create({
      data: {
        type: "system",
        body: `Quote ${quote.reference} v${quote.version} expired without an answer`,
        dealId: quote.dealId,
        createdByName: "System",
      },
    });
    await notify([quote.createdBy, quote.deal.ownerId], {
      kind: "quote.expired",
      title: `${quote.reference} expired`,
      body: "The client did not answer in time. Make a new version to renew the offer.",
      href: `/dashboard/sales/quotes/${quote.id}`,
    });
  }
  return expired;
}
