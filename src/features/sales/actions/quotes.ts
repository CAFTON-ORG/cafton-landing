"use server";

import { revalidatePath } from "next/cache";

import { guard, refreshCrm } from "@/features/crm/actions/guard";
import { logActivity } from "@/features/crm/actions/shared";
import { live } from "@/features/crm/mappers";
import { notify, staffIdsWith } from "@/features/notifications/server";
import { addDays, manilaDate } from "@/features/schedule/slots";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { formatMinor } from "@/lib/money";
import { quoteLink, sendQuoteEmail } from "../emails";
import { generateToken, hashToken } from "../integrity";
import { lineTotal, quoteTotals } from "../pricing";
import { getPublicQuote } from "../repository";
import {
  DEFAULT_DEPOSIT_PCT,
  DEFAULT_TAX_RATE_PCT,
  DEFAULT_VALID_DAYS,
  LIVE_STATUSES,
  approvalReasons,
  canEdit,
  checkAmounts,
  checkApprover,
  checkCreate,
  checkDelete,
  checkRevise,
  checkSend,
  checkValidity,
  checkWithdraw,
  submitTarget,
  type QuoteStatus,
} from "../rules";
import { quoteSchema, type QuoteInput } from "../schemas";
import { fingerprintOf, moveDealAfter } from "../server";

const DEFAULT_INTRO =
  "Thank you for the chance to work with you. This quote sets out what we will do and what it costs.";
const DEFAULT_TERMS = [
  "Prices are in Philippine pesos and include VAT where shown.",
  "This quote is valid until the date above. Work starts once it is accepted and the deposit is received.",
  "Anything outside the lines above is quoted separately.",
].join("\n");
const DEFAULT_PAYMENT_TERMS =
  "The deposit is due when the quote is accepted. The balance is due on completion. Payment by bank transfer; details are on the invoice.";

function refreshSales(dealId?: string) {
  refreshCrm();
  revalidatePath("/dashboard/sales/quotes");
  if (dealId) revalidatePath(`/dashboard/crm/deals/${dealId}`);
  revalidatePath("/dashboard/sales/quotes/[id]", "page");
}

const link = (quoteId: string) => `/dashboard/sales/quotes/${quoteId}`;

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
          stage: { select: { kind: true } },
          contact: { select: { email: true, firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!quote) throw new ActionError("That quote no longer exists.");
  return quote;
}

async function isNewest(reference: string, version: number) {
  const newest = await prisma.quote.aggregate({ where: { reference }, _max: { version: true } });
  return (newest._max.version ?? version) <= version;
}

const maxDiscount = (lines: { discountPct: number }[]) =>
  lines.reduce((max, line) => Math.max(max, line.discountPct), 0);

/** Starts a draft quote for a deal, filled in with sensible defaults. One live quote per deal. */
export async function createQuote(dealId: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("quotes:create");
    const id = await prisma.$transaction(async (tx) => {
      const deal = await tx.deal.findFirst({
        where: { id: dealId, ...live },
        include: { stage: true },
      });
      if (!deal) throw new ActionError("That deal no longer exists.");
      const liveQuotes = await tx.quote.count({
        where: { dealId, status: { in: LIVE_STATUSES as QuoteStatus[] } },
      });
      const blocked = checkCreate({ stageKind: deal.stage.kind }, liveQuotes);
      if (blocked) throw new ActionError(blocked, "rule");

      const numbers = await tx.$queryRaw<{ reference: string }[]>`
        SELECT 'QT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('quote_reference_seq')::text, 4, '0') AS reference`;
      const quote = await tx.quote.create({
        data: {
          reference: numbers[0].reference,
          dealId,
          title: deal.title,
          intro: DEFAULT_INTRO,
          terms: DEFAULT_TERMS,
          paymentTerms: DEFAULT_PAYMENT_TERMS,
          depositPct: DEFAULT_DEPOSIT_PCT,
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

/** Saves the quote's wording and lines and works out the totals. Drafts only. */
export async function saveQuote(id: string, input: QuoteInput): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("quotes:update");
    const data = parse(quoteSchema, input);
    const dealId = await prisma.$transaction(async (tx) => {
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
      const blocked = checkAmounts(totals.totalMinor, data.depositPct);
      if (blocked) throw new ActionError(blocked, "rule");

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
          paymentTerms: data.paymentTerms ?? null,
          depositPct: data.depositPct,
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
      return quote.dealId;
    });
    refreshSales(dealId);
  });
}

/**
 * Moves a finished draft forward: straight to approved when nothing needs a second look, otherwise
 * to someone who can approve (a big total or a big discount).
 */
export async function submitQuote(id: string): Promise<ActionResult<{ status: QuoteStatus }>> {
  return runAction(async () => {
    const actor = await guard("quotes:update");
    const result = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id }, include: { lines: true } });
      if (!quote) throw new ActionError("That quote no longer exists.");
      if (quote.status !== "draft") throw new ActionError("Only a draft can be submitted.", "rule");
      if (quote.lines.length === 0) throw new ActionError("Add at least one line first.", "rule");
      const total = Number(quote.totalMinor);
      if (total <= 0) throw new ActionError("The total must be more than zero.", "rule");
      const validity = checkValidity(
        quote.validUntil?.toISOString().slice(0, 10),
        manilaDate(new Date()),
      );
      if (validity) throw new ActionError(validity, "rule");

      const facts = { totalMinor: total, maxDiscountPct: maxDiscount(quote.lines) };
      const reasons = approvalReasons(facts);
      const status = submitTarget(facts);
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
              ? `Submitted quote ${quote.reference} (approved automatically: no approval needed)`
              : `Submitted quote ${quote.reference} for approval: ${reasons.join(" ")}`,
        },
        tx,
      );
      return { status, dealId: quote.dealId, reference: quote.reference, total, reasons };
    });
    if (result.status === "pending_approval") {
      await notify(
        await staffIdsWith("quotes:approve"),
        {
          kind: "quote.approval",
          title: `Quote ${result.reference} needs approval`,
          body: result.reasons.join(" "),
          href: link(id),
        },
        actorId(actor),
      );
    }
    refreshSales(result.dealId);
    return { status: result.status };
  });
}

/** A second pair of eyes. You can't approve a quote you wrote, unless you are an Owner. */
export async function approveQuote(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("quotes:approve");
    const done = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id } });
      if (!quote) throw new ActionError("That quote no longer exists.");
      if (quote.status !== "pending_approval") {
        throw new ActionError("This quote isn't waiting for approval.", "rule");
      }
      const blocked = checkApprover({
        createdBy: quote.createdBy,
        approverId: actorId(actor),
        roleKey: actor.roleKey,
      });
      if (blocked) throw new ActionError(blocked, "rule");
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
      if (quote.status !== "pending_approval") {
        throw new ActionError("This quote isn't waiting for approval.", "rule");
      }
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

/**
 * Emails the quote (link and PDF) to the deal's contact. Every send makes a fresh link (an older
 * one stops working) and fingerprints exactly what was sent. A deal still early in its pipeline is
 * moved to Proposal.
 */
export async function sendQuote(
  id: string,
): Promise<ActionResult<{ emailed: boolean; link: string }>> {
  return runAction(async () => {
    const actor = await guard("quotes:send");
    const quote = await load(id);
    const recipient = quote.deal.contact.email?.trim() || null;
    const blocked = checkSend({
      status: quote.status as QuoteStatus,
      lineCount: quote.lines.length,
      totalMinor: Number(quote.totalMinor),
      recipient,
      validUntil: quote.validUntil ? quote.validUntil.toISOString().slice(0, 10) : null,
      isNewest: await isNewest(quote.reference, quote.version),
      dealKind: quote.deal.stage.kind,
      today: manilaDate(new Date()),
    });
    if (blocked) throw new ActionError(blocked, "rule");

    const token = generateToken();
    await prisma.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id },
        data: {
          status: "sent",
          tokenHash: hashToken(token),
          sentHash: fingerprintOf(quote),
          sentAt: new Date(),
          sentTo: recipient,
        },
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
      await moveDealAfter(tx, actor, quote.dealId, "send");
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
    return { emailed, link: quoteLink(token) };
  });
}

/**
 * Only a hash of the client's link is kept, so it can't be read back. To get a link to send
 * yourself, make a new one: the old link stops working at once.
 */
export async function renewQuoteLink(id: string): Promise<ActionResult<{ link: string }>> {
  return runAction(async () => {
    const actor = await guard("quotes:send");
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new ActionError("That quote no longer exists.");
    if (quote.status !== "sent") {
      throw new ActionError("Only a quote waiting for an answer has a link.", "rule");
    }
    const token = generateToken();
    await prisma.$transaction(async (tx) => {
      await tx.quote.update({ where: { id }, data: { tokenHash: hashToken(token) } });
      await recordAudit(
        actor,
        {
          action: "quote.link",
          entity: "quote",
          entityId: id,
          summary: `Made a new link for quote ${quote.reference}; the old one no longer works`,
        },
        tx,
      );
    });
    return { link: quoteLink(token) };
  });
}

/** Takes an open quote off the table, with a reason. The client's link then says it was withdrawn. */
export async function withdrawQuote(id: string, reason: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("quotes:update");
    const dealId = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id } });
      if (!quote) throw new ActionError("That quote no longer exists.");
      const blocked = checkWithdraw(quote.status as QuoteStatus, reason);
      if (blocked) throw new ActionError(blocked, "rule");
      await tx.quote.update({
        where: { id },
        data: { status: "withdrawn", withdrawnAt: new Date(), withdrawnReason: reason.trim() },
      });
      await logActivity(
        tx,
        actor,
        { dealId: quote.dealId },
        "system",
        `Withdrew quote ${quote.reference} v${quote.version}: ${reason.trim()}`,
      );
      await recordAudit(
        actor,
        {
          action: "quote.withdraw",
          entity: "quote",
          entityId: id,
          summary: `Withdrew quote ${quote.reference} v${quote.version}: ${reason.trim()}`,
        },
        tx,
      );
      return quote.dealId;
    });
    refreshSales(dealId);
  });
}

/** Makes the next version of a quote as a fresh draft, and retires the old one. */
export async function reviseQuote(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("quotes:create");
    const created = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({
        where: { id },
        include: { lines: true, deal: { select: { stage: { select: { kind: true } } } } },
      });
      if (!quote) throw new ActionError("That quote no longer exists.");
      const newest = await tx.quote.aggregate({
        where: { reference: quote.reference },
        _max: { version: true },
      });
      const blocked = checkRevise(
        quote.status as QuoteStatus,
        quote.deal.stage.kind,
        (newest._max.version ?? quote.version) <= quote.version,
      );
      if (blocked) throw new ActionError(blocked, "rule");
      const next = await tx.quote.create({
        data: {
          reference: quote.reference,
          version: quote.version + 1,
          dealId: quote.dealId,
          title: quote.title,
          intro: quote.intro,
          terms: quote.terms,
          paymentTerms: quote.paymentTerms,
          depositPct: quote.depositPct,
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
      return { id: next.id, dealId: quote.dealId };
    });
    refreshSales(created.dealId);
    return { id: created.id };
  });
}

/** Only a draft that was never sent can be deleted. Everything else is a record. */
export async function deleteQuote(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("quotes:delete");
    const dealId = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id } });
      if (!quote) throw new ActionError("That quote no longer exists.");
      const blocked = checkDelete(
        quote.status as QuoteStatus,
        quote.sentAt !== null || quote.tokenHash !== null,
      );
      if (blocked) throw new ActionError(blocked, "rule");
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
