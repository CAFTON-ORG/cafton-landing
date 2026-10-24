import "server-only";

import { createHash } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import { SITE_NAME } from "@/config/site";
import { fullName } from "@/features/crm/rules/core";
import { manilaDate } from "@/features/schedule/rules/slots";
import { quantityText } from "@/features/sales/rules/pricing";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { fillTemplate, type MergeKey } from "../rules/merge";
import { LIVE_STATUSES, type ContractStatus } from "../rules/core";

type Tx = Prisma.TransactionClient;
type Actor = { id: string; name: string };

const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

/** "PHP 12,500.00": the same everywhere (screen, email, PDF), because the PDF fonts have no peso sign. */
export const phpText = (minor: number, currency = "PHP") =>
  `${currency} ${(minor / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const longDate = (value: string) =>
  new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );

/** The parts of a contract the client agrees to, as one fingerprint. */
export function fingerprintOf(contract: {
  kind: string;
  title: string;
  body: string;
  validUntil: Date | null;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        contract.kind,
        contract.title,
        contract.body,
        day(contract.validUntil) ?? "",
      ]),
    )
    .digest("hex");
}

/** The deal's own details for the template's merge fields. */
export async function mergeValues(
  tx: Tx,
  dealId: string,
  quoteId: string | null,
): Promise<Partial<Record<MergeKey, string>>> {
  const deal = await tx.deal.findUniqueOrThrow({
    where: { id: dealId },
    select: {
      title: true,
      reference: true,
      contact: { select: { firstName: true, lastName: true, email: true } },
      organization: { select: { name: true } },
    },
  });
  const values: Partial<Record<MergeKey, string>> = {
    client_name: fullName(deal.contact),
    client_email: deal.contact.email?.trim() ?? "",
    client_company: deal.organization?.name ?? "",
    company_name: SITE_NAME,
    deal_title: deal.title,
    deal_reference: deal.reference,
    today: longDate(manilaDate(new Date())),
  };
  if (quoteId) {
    const quote = await tx.quote.findUniqueOrThrow({
      where: { id: quoteId },
      include: { lines: { orderBy: { position: "asc" } } },
    });
    const total = Number(quote.totalMinor);
    const deposit = Math.round((total * quote.depositPct) / 100);
    values.quote_reference = `${quote.reference} v${quote.version}`;
    values.quote_total = phpText(total, quote.currency);
    values.quote_deposit = phpText(deposit, quote.currency);
    values.quote_balance = phpText(total - deposit, quote.currency);
    values.payment_terms = quote.paymentTerms ?? "";
    values.quote_scope = quote.lines
      .map(
        (line) =>
          `- ${line.description} (${quantityText(line.quantityMilli)} ${line.unitLabel}): ${phpText(Number(line.totalMinor), quote.currency)}`,
      )
      .join("\n");
  }
  return values;
}

export const renderContractBody = (template: string, values: Partial<Record<MergeKey, string>>) =>
  fillTemplate(template, values);

/**
 * When a deal is lost, every contract still out with the client is withdrawn (drafts stay drafts).
 * Called inside the deal's own transaction.
 */
export async function withdrawLiveContracts(tx: Tx, actor: Actor, dealId: string, reason: string) {
  const open = await tx.contract.findMany({
    where: { dealId, status: "sent" },
    select: { id: true, reference: true },
  });
  for (const contract of open) {
    await tx.contract.update({
      where: { id: contract.id },
      data: { status: "withdrawn", withdrawnAt: new Date(), withdrawnReason: reason },
    });
    await recordAudit(
      actor,
      {
        action: "contract.withdraw",
        entity: "contract",
        entityId: contract.id,
        summary: `Withdrew contract ${contract.reference}: ${reason}`,
      },
      tx,
    );
  }
  return open.length;
}

export const isLiveStatus = (status: ContractStatus) => LIVE_STATUSES.includes(status);

/** The statuses of a deal's contracts, for the "can it be deleted" rule. */
export async function contractStatusesFor(
  tx: Pick<Tx, "contract">,
  dealId: string,
): Promise<ContractStatus[]> {
  const rows = await tx.contract.findMany({ where: { dealId }, select: { status: true } });
  return rows.map((row) => row.status as ContractStatus);
}

/** Daily job: a sent contract whose date has passed becomes "expired", and its maker is told. */
export async function expireDueContracts(now = new Date()) {
  const today = manilaDate(now);
  const due = await prisma.contract.findMany({
    where: { status: "sent", validUntil: { lt: new Date(today) } },
    select: {
      id: true,
      reference: true,
      dealId: true,
      createdBy: true,
      deal: { select: { ownerId: true } },
    },
  });
  const { notify } = await import("@/features/notifications/services/notify");
  let expired = 0;
  for (const contract of due) {
    const done = await prisma.contract.updateMany({
      where: { id: contract.id, status: "sent" },
      data: { status: "expired" },
    });
    if (done.count === 0) continue;
    expired += 1;
    await prisma.activity.create({
      data: {
        type: "system",
        body: `Contract ${contract.reference} expired without a signature`,
        dealId: contract.dealId,
        createdByName: "System",
      },
    });
    await notify([contract.createdBy, contract.deal.ownerId], {
      kind: "contract.expired",
      title: `${contract.reference} expired`,
      body: "The client did not sign in time. Make a new one to renew the offer.",
      href: `/dashboard/sales/contracts/${contract.id}`,
    });
  }
  return expired;
}
