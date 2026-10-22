"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { guard, refreshCrm } from "@/features/crm/actions/guard";
import { logActivity } from "@/features/crm/actions/shared";
import { live } from "@/features/crm/mappers";
import { notify } from "@/features/notifications/server";
import { manilaDate } from "@/features/schedule/slots";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { formatMinor } from "@/lib/money";
import { lineTotal, quoteTotals } from "../pricing";
import { sendQuoteEmail } from "../emails";
import { getPublicQuote } from "../repository";
import {
  DEFAULT_TAX_RATE_PCT,
  DEFAULT_VALID_DAYS,
  canEdit,
  checkSend,
  submitTarget,
  type QuoteStatus,
} from "../rules";
import { quoteSchema, type QuoteInput } from "../schemas";
import { addDays } from "@/features/schedule/slots";

const DEFAULT_INTRO =
  "Thank you for the chance to work with you. This quote sets out what we will do and what it costs.";
const DEFAULT_TERMS = [
  "Prices are in Philippine pesos and include VAT where shown.",
  "This quote is valid until the date above. Work starts once it is accepted and the first payment is received.",
  "Anything outside the lines above is quoted separately.",
].join("\n");

function refreshSales(dealId?: string) {
  refreshCrm();
  revalidatePath("/dashboard/sales/quotes");
  if (dealId) revalidatePath(`/dashboard/crm/deals/${dealId}`);
  revalidatePath("/dashboard/sales/quotes/[id]", "page");
}

async function load(id: string) {
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      lines: true,
      deal: {
        select: {
          id: true,
          title: true,
          ownerId: true,
          contact: { select: { email: true, firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!quote) throw new ActionError("That quote no longer exists.");
  return quote;
}

async function assertNewest(reference: string, version: number) {
  const newest = await prisma.quote.aggregate({ where: { reference }, _max: { version: true } });
  if ((newest._max.version ?? version) > version) {
    throw new ActionError("A newer version of this quote exists. Open that one.", "rule");
  }
}

const link = (quoteId: string) => `/dashboard/sales/quotes/${quoteId}`;

/** Starts a draft quote for a deal. Everything is filled in with sensible defaults. */
export async function createQuote(dealId: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("quotes:create");
    const id = await prisma.$transaction(async (tx) => {
      const deal = await tx.deal.findFirst({
        where: { id: dealId, ...live },
        include: { stage: true },
      });
      if (!deal) throw new ActionError("That deal no longer exists.");
      if (deal.stage.kind === "lost")
        throw new ActionError("A lost deal can't have a new quote. Reopen it first.", "rule");

      const numbers = await tx.$queryRaw<{ reference: string }[]>`
        SELECT 'QT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('quote_reference_seq')::text, 4, '0') AS reference`;
      const quote = await tx.quote.create({
        data: {
          reference: numbers[0].reference,
          dealId,
          title: deal.title,
          intro: DEFAULT_INTRO,
          terms: DEFAULT_TERMS,
          currency: deal.currency,
          taxRatePct: DEFAULT_TAX_RATE_PCT,
          validUntil: new Date(addDays(manilaDate(new Date()), DEFAULT_VALID_DAYS)),
          createdBy: actorId(actor),
        },
      });
      await logActivity(tx, actor, { dealId }, "system", `Started quote ${quote.reference}`);
      await recordAudit(
        actor,
        {
          action: "quote.create",
          entity: "quote",
          entityId: quote.id,
          summary: `Started quote ${quote.reference} for ${deal.title}`,
        },
        tx,
      );
      return quote.id;
    });
    refreshSales(dealId);
    return { id };
  });
}

/** Saves the quote's wording and lines, and works out the totals. Drafts only. */
export async function saveQuote(id: string, input: QuoteInput): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("quotes:update");
    const data = parse(quoteSchema, input);
    await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id } });
      if (!quote) throw new ActionError("That quote no longer exists.");
      if (!canEdit(quote.status as QuoteStatus)) {
        throw new ActionError(
          "Only a draft can be edited. Make a new version to change it.",
          "rule",
        );
      }
      const priced = data.lines.map((line) => ({
        unitPriceMinor: line.price,
        quantityMilli: line.quantity,
        discountPct: line.discountPct,
        taxable: line.taxable,
      }));
      const totals = quoteTotals(priced, quote.taxRatePct);

      await tx.quoteLine.deleteMany({ where: { quoteId: id } });
      if (data.lines.length > 0) {
        await tx.quoteLine.createMany({
          data: data.lines.map((line, index) => ({
            quoteId: id,
            position: index + 1,
            catalogItemId: line.catalogItemId,
            description: line.description,
            quantityMilli: line.quantity,
            unitLabel: line.unitLabel,
            unitPriceMinor: BigInt(line.price),
            discountPct: line.discountPct,
            taxable: line.taxable,
            totalMinor: BigInt(
              lineTotal({
                unitPriceMinor: line.price,
                quantityMilli: line.quantity,
                discountPct: line.discountPct,
              }),
            ),
          })),
        });
      }
      await tx.quote.update({
        where: { id },
        data: {
          title: data.title,
          intro: data.intro ?? null,
          terms: data.terms ?? null,
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          subtotalMinor: BigInt(totals.subtotalMinor),
          taxMinor: BigInt(totals.taxMinor),
          totalMinor: BigInt(totals.totalMinor),
        },
      });
      await recordAudit(
        actor,
        {
          action: "quote.update",
          entity: "quote",
          entityId: id,
          summary: `Edited quote ${quote.reference} v${quote.version}`,
        },
        tx,
      );
    });
    const saved = await prisma.quote.findUnique({ where: { id }, select: { dealId: true } });
    refreshSales(saved?.dealId);
  });
}

/** Moves a finished draft forward: straight to approved when small, otherwise to someone who can approve. */
export async function submitQuote(id: string): Promise<ActionResult<{ status: QuoteStatus }>> {
  return runAction(async () => {
    const actor = await guard("quotes:update");
    const result = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({
        where: { id },
        include: { lines: { select: { id: true } } },
      });
      if (!quote) throw new ActionError("That quote no longer exists.");
      if (quote.status !== "draft") throw new ActionError("Only a draft can be submitted.", "rule");
      if (quote.lines.length === 0) throw new ActionError("Add at least one line first.", "rule");
      const total = Number(quote.totalMinor);
      if (total <= 0) throw new ActionError("The total must be more than zero.", "rule");
      const status = submitTarget(total);
      await tx.quote.update({
        where: { id },
        data: status === "approved" ? { status, approvedAt: new Date() } : { status },
      });
      await recordAudit(
        actor,
        {
          action: "quote.submit",
          entity: "quote",
          entityId: id,
          summary:
            status === "approved"
              ? `Submitted quote ${quote.reference} (approved automatically: under the limit)`
              : `Submitted quote ${quote.reference} for approval`,
        },
        tx,
      );
      return { status, dealId: quote.dealId, reference: quote.reference, total };
    });
    if (result.status === "pending_approval") {
      const { staffIdsWith } = await import("@/features/notifications/server");
      await notify(
        await staffIdsWith("quotes:approve"),
        {
          kind: "quote.approval",
          title: `Quote ${result.reference} needs approval`,
          body: formatMinor(result.total),
          href: link(id),
        },
        actorId(actor),
      );
    }
    refreshSales(result.dealId);
    return { status: result.status };
  });
}

/**
 * Approval is a second pair of eyes: you can't approve a quote you wrote, unless you are an Owner
 * (so a one-person team is never stuck).
 */
export async function approveQuote(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("quotes:approve");
    const done = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id } });
      if (!quote) throw new ActionError("That quote no longer exists.");
      if (quote.status !== "pending_approval")
        throw new ActionError("This quote isn't waiting for approval.", "rule");
      if (quote.createdBy && quote.createdBy === actorId(actor) && actor.roleKey !== "owner") {
        throw new ActionError("Someone else has to approve a quote you wrote.", "rule");
      }
      await tx.quote.update({
        where: { id },
        data: { status: "approved", approvedBy: actorId(actor), approvedAt: new Date() },
      });
      await recordAudit(
        actor,
        {
          action: "quote.approve",
          entity: "quote",
          entityId: id,
          summary: `Approved quote ${quote.reference} (${formatMinor(Number(quote.totalMinor), quote.currency)})`,
        },
        tx,
      );
      return quote;
    });
    // After the change is saved: a notification must never hold the transaction open.
    await notify(
      [done.createdBy],
      { kind: "quote.approved", title: `Quote ${done.reference} was approved`, href: link(id) },
      actorId(actor),
    );
    refreshSales(done.dealId);
  });
}

/** Sends a quote back to its writer with a reason. */
export async function rejectQuote(id: string, reason: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("quotes:approve");
    const why = reason.trim();
    if (!why) throw new ActionError("Say what to change.", "rule");
    const done = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id } });
      if (!quote) throw new ActionError("That quote no longer exists.");
      if (quote.status !== "pending_approval")
        throw new ActionError("This quote isn't waiting for approval.", "rule");
      await tx.quote.update({ where: { id }, data: { status: "draft" } });
      await logActivity(
        tx,
        actor,
        { dealId: quote.dealId },
        "system",
        `Quote ${quote.reference} was sent back: ${why}`,
      );
      await recordAudit(
        actor,
        {
          action: "quote.reject",
          entity: "quote",
          entityId: id,
          summary: `Sent quote ${quote.reference} back: ${why}`,
        },
        tx,
      );
      return quote;
    });
    await notify(
      [done.createdBy],
      {
        kind: "quote.rejected",
        title: `Quote ${done.reference} needs changes`,
        body: why,
        href: link(id),
      },
      actorId(actor),
    );
    refreshSales(done.dealId);
  });
}

/** Emails the quote (link and PDF) to the deal's contact. Sending again re-sends the same link. */
export async function sendQuote(
  id: string,
): Promise<ActionResult<{ emailed: boolean; link: string }>> {
  return runAction(async () => {
    const actor = await guard("quotes:send");
    const quote = await load(id);
    await assertNewest(quote.reference, quote.version);
    const recipient = quote.deal.contact.email?.trim() || null;
    const blocked = checkSend({
      status: quote.status as QuoteStatus,
      lineCount: quote.lines.length,
      totalMinor: Number(quote.totalMinor),
      recipient,
      validUntil: quote.validUntil ? quote.validUntil.toISOString().slice(0, 10) : null,
      today: manilaDate(new Date()),
    });
    if (blocked) throw new ActionError(blocked, "rule");

    const token = quote.publicToken ?? randomBytes(32).toString("base64url");
    await prisma.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id },
        data: { status: "sent", publicToken: token, sentAt: new Date(), sentTo: recipient },
      });
      await logActivity(
        tx,
        actor,
        { dealId: quote.dealId },
        "email",
        `Sent quote ${quote.reference} v${quote.version} to ${recipient}`,
      );
      await recordAudit(
        actor,
        {
          action: "quote.send",
          entity: "quote",
          entityId: id,
          summary: `Sent quote ${quote.reference} v${quote.version} to ${recipient}`,
        },
        tx,
      );
    });

    const publicQuote = await getPublicQuote(token);
    let emailed = false;
    if (publicQuote && recipient) {
      const result = await sendQuoteEmail({
        to: recipient,
        recipientName: publicQuote.recipientName,
        quote: publicQuote,
        token,
        senderName: actor.name,
      });
      emailed = result.ok;
    }
    refreshSales(quote.dealId);
    const { quoteLink } = await import("../emails");
    return { emailed, link: quoteLink(token) };
  });
}

/** Makes the next version of a quote as a fresh draft, and retires the old one. */
export async function reviseQuote(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("quotes:create");
    const newId = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id }, include: { lines: true } });
      if (!quote) throw new ActionError("That quote no longer exists.");
      if (quote.status === "accepted")
        throw new ActionError("An accepted quote is an agreement and can't be revised.", "rule");
      if (quote.status === "superseded")
        throw new ActionError("A newer version already exists.", "rule");
      const next = await tx.quote.create({
        data: {
          reference: quote.reference,
          version: quote.version + 1,
          dealId: quote.dealId,
          title: quote.title,
          intro: quote.intro,
          terms: quote.terms,
          currency: quote.currency,
          taxRatePct: quote.taxRatePct,
          subtotalMinor: quote.subtotalMinor,
          taxMinor: quote.taxMinor,
          totalMinor: quote.totalMinor,
          validUntil: new Date(addDays(manilaDate(new Date()), DEFAULT_VALID_DAYS)),
          createdBy: actorId(actor),
          lines: {
            create: quote.lines.map((line) => ({
              position: line.position,
              catalogItemId: line.catalogItemId,
              description: line.description,
              quantityMilli: line.quantityMilli,
              unitLabel: line.unitLabel,
              unitPriceMinor: line.unitPriceMinor,
              discountPct: line.discountPct,
              taxable: line.taxable,
              totalMinor: line.totalMinor,
            })),
          },
        },
      });
      await tx.quote.update({ where: { id }, data: { status: "superseded" } });
      await logActivity(
        tx,
        actor,
        { dealId: quote.dealId },
        "system",
        `Started version ${next.version} of quote ${quote.reference}`,
      );
      await recordAudit(
        actor,
        {
          action: "quote.revise",
          entity: "quote",
          entityId: next.id,
          summary: `Started version ${next.version} of quote ${quote.reference}`,
        },
        tx,
      );
      return next.id;
    });
    const made = await prisma.quote.findUnique({ where: { id: newId }, select: { dealId: true } });
    refreshSales(made?.dealId);
    return { id: newId };
  });
}

export async function deleteQuote(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("quotes:delete");
    const dealId = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id } });
      if (!quote) throw new ActionError("That quote no longer exists.");
      if (quote.status !== "draft")
        throw new ActionError("Only a draft can be deleted. A sent quote is a record.", "rule");
      if (quote.publicToken)
        throw new ActionError("This quote was sent and can't be deleted.", "rule");
      await tx.quote.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "quote.delete",
          entity: "quote",
          entityId: id,
          summary: `Deleted draft ${quote.reference} v${quote.version}`,
        },
        tx,
      );
      return quote.dealId;
    });
    refreshSales(dealId);
  });
}

/** The client's link for a quote that was already sent, to copy. It never sends anything. */
export async function quoteLinkFor(id: string): Promise<ActionResult<{ link: string }>> {
  return runAction(async () => {
    await guard("quotes:send");
    const quote = await prisma.quote.findUnique({ where: { id }, select: { publicToken: true } });
    if (!quote?.publicToken) throw new ActionError("This quote has not been sent yet.", "rule");
    const { quoteLink } = await import("../emails");
    return { link: quoteLink(quote.publicToken) };
  });
}
