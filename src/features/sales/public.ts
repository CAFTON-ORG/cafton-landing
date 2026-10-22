"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { notify } from "@/features/notifications/server";
import { manilaDate } from "@/features/schedule/slots";
import { ActionError, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { emit } from "@/lib/events";
import { formatMinor } from "@/lib/money";
import { sendMail } from "@/lib/mail";
import { renderEmail } from "@/lib/mail-templates";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { checkRespond, type QuoteStatus } from "./rules";
import { respondSchema, type RespondInput } from "./schemas";

/** The system acting for a client who used the public link: there is no staff member to name. */
const CLIENT = { id: "client-link", name: "Client (public quote link)" };

async function caller() {
  const list = await headers();
  const ip =
    list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "unknown";
  return { ip, userAgent: (list.get("user-agent") ?? "").slice(0, 300) };
}

/** Marks the quote as seen the first time the link is opened (so staff know it reached them). */
export async function markQuoteViewed(token: string) {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return;
  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
    select: {
      id: true,
      viewedAt: true,
      status: true,
      reference: true,
      createdBy: true,
      deal: { select: { ownerId: true } },
    },
  });
  if (!quote || quote.viewedAt || quote.status !== "sent") return;
  await prisma.quote.update({ where: { id: quote.id }, data: { viewedAt: new Date() } });
  await notify([quote.createdBy, quote.deal.ownerId], {
    kind: "quote.viewed",
    title: `${quote.reference} was opened`,
    href: `/dashboard/sales/quotes/${quote.id}`,
  });
}

/**
 * The client's answer from the public link. Accepting records who agreed (the name they typed,
 * when, from which address and browser, and exactly what total) so it stands as an e-signature
 * under the Philippine Electronic Commerce Act. It cannot be changed afterwards.
 */
export async function respondToQuote(
  input: RespondInput,
): Promise<ActionResult<{ status: QuoteStatus }>> {
  return runAction(async () => {
    const data = parse(respondSchema, input);
    const who = await caller();
    const limit = checkRateLimit(`quote-reply:${who.ip}`, { limit: 12, windowMs: 10 * 60_000 });
    if (!limit.allowed) throw new ActionError("Too many tries. Please wait a few minutes.");

    const quote = await prisma.quote.findUnique({
      where: { publicToken: data.token },
      include: {
        deal: {
          select: {
            id: true,
            title: true,
            ownerId: true,
            amountMinor: true,
            stage: { select: { kind: true } },
            contact: { select: { email: true, firstName: true } },
          },
        },
      },
    });
    if (!quote) throw new ActionError("This link isn't valid any more.");
    const blocked = checkRespond(
      {
        status: quote.status as QuoteStatus,
        validUntil: quote.validUntil ? quote.validUntil.toISOString().slice(0, 10) : null,
      },
      manilaDate(new Date()),
    );
    if (blocked) throw new ActionError(blocked, "rule");

    const total = Number(quote.totalMinor);
    const now = new Date();
    const status: QuoteStatus = data.action === "accept" ? "accepted" : "declined";

    await prisma.$transaction(async (tx) => {
      // Re-check inside the transaction: two answers at once must not both win.
      const claimed = await tx.quote.updateMany({
        where: { id: quote.id, status: "sent" },
        data:
          data.action === "accept"
            ? {
                status: "accepted",
                acceptedAt: now,
                acceptedByName: data.name,
                acceptedByEmail: data.email ?? null,
                acceptedIp: who.ip,
                acceptedUserAgent: who.userAgent,
                acceptedTotalMinor: quote.totalMinor,
              }
            : { status: "declined", declinedAt: now, declinedReason: data.reason },
      });
      if (claimed.count === 0) throw new ActionError("This quote was just answered.", "rule");

      if (data.action === "accept" && quote.deal.stage.kind === "open") {
        // The deal's value follows what the client agreed to.
        await tx.deal.update({
          where: { id: quote.dealId },
          data: { amountMinor: quote.totalMinor },
        });
      }
      await tx.activity.create({
        data: {
          type: "system",
          body:
            data.action === "accept"
              ? `Quote ${quote.reference} v${quote.version} was accepted by ${data.name} (${formatMinor(total, quote.currency)})`
              : `Quote ${quote.reference} v${quote.version} was declined: ${data.reason}`,
          dealId: quote.dealId,
          createdByName: CLIENT.name,
        },
      });
      await recordAudit(
        CLIENT,
        {
          action: data.action === "accept" ? "quote.accept" : "quote.decline",
          entity: "quote",
          entityId: quote.id,
          summary:
            data.action === "accept"
              ? `${data.name} accepted quote ${quote.reference} v${quote.version} (${formatMinor(total, quote.currency)})`
              : `Quote ${quote.reference} v${quote.version} was declined`,
          metadata:
            data.action === "accept"
              ? { ip: who.ip, userAgent: who.userAgent, totalMinor: total }
              : { reason: data.reason },
        },
        tx,
      );
    });

    await notify([quote.createdBy, quote.deal.ownerId], {
      kind: data.action === "accept" ? "quote.accepted" : "quote.declined",
      title:
        data.action === "accept"
          ? `${quote.reference} was accepted`
          : `${quote.reference} was declined`,
      body:
        data.action === "accept"
          ? `${data.name} · ${formatMinor(total, quote.currency)}. Mark the deal as won.`
          : data.reason,
      href: `/dashboard/sales/quotes/${quote.id}`,
    });

    if (data.action === "accept") {
      if (data.email || quote.deal.contact.email) {
        const { html, text } = renderEmail({
          title: "Thank you, your quote is accepted",
          paragraphs: [
            `Hi ${data.name.split(" ")[0]}, we received your acceptance of quote ${quote.reference} (${formatMinor(total, quote.currency)}).`,
            "We will be in touch shortly about the next steps. Keep this email as your record.",
          ],
          facts: [
            ["Quote", `${quote.reference} v${quote.version}`],
            ["Accepted by", data.name],
            ["When", now.toISOString()],
          ],
        });
        await sendMail({
          to: data.email || quote.deal.contact.email!,
          subject: `Accepted: quote ${quote.reference}`,
          text,
          html,
        });
      }
      await emit("quote.accepted", {
        quoteId: quote.id,
        reference: quote.reference,
        dealId: quote.dealId,
        totalMinor: total,
        currency: quote.currency,
        acceptedByName: data.name,
      });
    }

    revalidatePath(`/dashboard/crm/deals/${quote.dealId}`);
    revalidatePath("/dashboard/sales/quotes");
    revalidatePath(`/q/${data.token}`);
    return { status };
  });
}
