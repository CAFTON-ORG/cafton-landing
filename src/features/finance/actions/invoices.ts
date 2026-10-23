"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { guard } from "@/features/crm/actions/guard";
import { live } from "@/features/crm/mappers";
import { fullName } from "@/features/crm/rules";
import { addDays, manilaDate } from "@/features/schedule/slots";
import { parseQuantity } from "@/features/sales/pricing";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { parseMinor } from "@/lib/money";
import { nextDocumentNumber } from "../documents";
import { sendInvoiceEmail } from "../emails";
import { getInvoice } from "../invoice-repository";
import {
  creditNoteSchema,
  invoiceSchema,
  newInvoiceSchema,
  paymentSchema,
  voidSchema,
  type CreditNoteInput,
  type InvoiceInput,
  type NewInvoiceInput,
  type PaymentInput,
} from "../invoice-schemas";
import {
  DEFAULT_TERMS_DAYS,
  balanceOf,
  checkCreditNote,
  checkDraft,
  checkIssue,
  checkMilestoneInvoiceable,
  checkPayment,
  checkVoidInvoice,
  checkVoidSettlement,
  invoiceTotals,
  lineAmount,
  type InvoiceStatus,
} from "../invoicing";
import { accountForRole, postJournal, reverseJournal } from "../ledger";
import { taxOf } from "../rules";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function refresh(id?: string) {
  for (const path of [
    "/dashboard/finance/invoices",
    "/dashboard/finance/payments",
    "/dashboard/finance/receivables",
    "/dashboard/finance/journal",
    "/dashboard/audit",
  ]) {
    revalidatePath(path);
  }
  revalidatePath("/dashboard/finance/invoices/[id]", "page");
  if (id) revalidatePath(`/dashboard/finance/invoices/${id}`);
  revalidatePath("/dashboard/projects/[id]", "page");
}

const today = () => manilaDate(new Date());
const date = (value: string | null) => (value ? new Date(`${value}T00:00:00Z`) : null);
const iso = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);

/** Pesos text to centavos; "" is zero; anything else that isn't an amount is a field error. */
function pesos(
  text: string,
  field: string,
  message = "Enter an amount like 1250 or 1,250.50.",
): number {
  if (!text.trim()) return 0;
  const minor = parseMinor(text);
  if (minor === null) throw new ActionError(message, "validation", { [field]: message });
  return minor;
}

/** What has been paid and credited against invoices, read inside the caller's transaction. */
async function standingsTx(tx: Tx, ids: string[]) {
  const map = new Map<string, { settledMinor: number; creditedMinor: number }>(
    ids.map((id) => [id, { settledMinor: 0, creditedMinor: 0 }]),
  );
  if (ids.length === 0) return map;
  const [paid, credited] = await Promise.all([
    tx.paymentAllocation.groupBy({
      by: ["invoiceId"],
      where: { invoiceId: { in: ids }, payment: { status: "recorded" } },
      _sum: { amountMinor: true },
    }),
    tx.creditNote.groupBy({
      by: ["invoiceId"],
      where: { invoiceId: { in: ids }, status: "issued" },
      _sum: { totalMinor: true },
    }),
  ]);
  for (const row of paid) map.get(row.invoiceId)!.settledMinor = Number(row._sum.amountMinor ?? 0);
  for (const row of credited)
    map.get(row.invoiceId)!.creditedMinor = Number(row._sum.totalMinor ?? 0);
  return map;
}

/** The rate of a tax code, in basis points; an unknown or switched-off code is refused. */
async function taxRateFor(tx: Tx, code: string): Promise<number> {
  const rate = await tx.taxRate.findUnique({ where: { code } });
  if (!rate || (!rate.active && code !== "NOVAT")) {
    throw new ActionError("That tax rate isn't available.", "validation", {
      taxCode: "Choose a tax rate that is switched on.",
    });
  }
  return rate.rateBp;
}

/* ---------------------------------------------------------------- drafting */

/** Starts a draft: empty for a client, from an accepted quote, or from finished billable milestones. */
export async function createInvoice(input: NewInvoiceInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("invoices:create");
    const data = parse(newInvoiceSchema, input);
    const issue = today();
    const due = addDays(issue, DEFAULT_TERMS_DAYS);

    const id = await prisma.$transaction(async (tx) => {
      let invoiceId: string;
      if (data.source === "blank") {
        const [org, contact] = await Promise.all([
          data.organizationId
            ? tx.organization.findFirst({ where: { id: data.organizationId, ...live } })
            : null,
          data.contactId ? tx.contact.findFirst({ where: { id: data.contactId, ...live } }) : null,
        ]);
        const clientName = org?.name ?? (contact ? fullName(contact) : data.clientName.trim());
        if (!clientName) {
          const message = "Choose a client, or type a name.";
          throw new ActionError(message, "validation", { clientName: message });
        }
        const created = await tx.invoice.create({
          data: {
            clientName,
            clientEmail: contact?.email || null,
            clientAddress: org?.address ?? null,
            organizationId: org?.id ?? contact?.organizationId ?? null,
            contactId: contact?.id ?? null,
            issueDate: date(issue),
            dueDate: date(due),
            createdBy: actorId(actor),
          },
        });
        invoiceId = created.id;
      } else if (data.source === "quote") {
        const quote = await tx.quote.findUnique({
          where: { id: data.quoteId },
          include: {
            lines: { orderBy: { position: "asc" } },
            deal: {
              include: { contact: true, organization: true, projects: { where: live, take: 1 } },
            },
          },
        });
        if (!quote || quote.status !== "accepted") {
          throw new ActionError("Only an accepted quote can be invoiced.", "rule");
        }
        if (
          (await tx.invoice.count({ where: { quoteId: quote.id, status: { not: "void" } } })) > 0
        ) {
          throw new ActionError("This quote already has an invoice.", "rule");
        }
        const rateBp = quote.taxRatePct * 100;
        const lines = quote.lines.map((line) => ({
          description: line.description,
          quantityMilli: line.quantityMilli,
          unitLabel: line.unitLabel,
          unitPriceMinor: line.unitPriceMinor,
          amountMinor: line.totalMinor,
          taxable: line.taxable,
        }));
        const totals = invoiceTotals(
          lines.map((line) => ({ amountMinor: Number(line.amountMinor), taxable: line.taxable })),
          rateBp,
        );
        // The invoice must come to exactly what the client accepted.
        if (totals.totalMinor !== Number(quote.totalMinor)) {
          throw new ActionError(
            "The quote's lines don't add up to its total, so it can't be invoiced as is.",
            "rule",
          );
        }
        const { deal } = quote;
        const created = await tx.invoice.create({
          data: {
            clientName: deal.organization?.name ?? fullName(deal.contact),
            clientEmail: deal.contact.email || null,
            clientAddress: deal.organization?.address ?? null,
            organizationId: deal.organizationId,
            contactId: deal.contactId,
            dealId: deal.id,
            projectId: deal.projects[0]?.id ?? null,
            quoteId: quote.id,
            issueDate: date(issue),
            dueDate: date(due),
            taxCode: rateBp === 0 ? "NOVAT" : rateBp === 1200 ? "VAT12" : "NOVAT",
            taxRateBp: rateBp,
            subtotalMinor: totals.subtotalMinor,
            taxMinor: totals.taxMinor,
            totalMinor: totals.totalMinor,
            notes: quote.paymentTerms ?? null,
            createdBy: actorId(actor),
            lines: { create: lines.map((line, position) => ({ ...line, position })) },
          },
        });
        invoiceId = created.id;
      } else {
        const milestones = await tx.milestone.findMany({
          where: { id: { in: data.milestoneIds } },
          include: { project: { include: { organization: true, contact: true } } },
          orderBy: { position: "asc" },
        });
        if (milestones.length !== new Set(data.milestoneIds).size) {
          throw new ActionError("Some of those milestones no longer exist.");
        }
        if (new Set(milestones.map((milestone) => milestone.projectId)).size !== 1) {
          throw new ActionError(
            "An invoice bills one project's milestones. Pick them from one project.",
            "rule",
          );
        }
        for (const milestone of milestones) {
          const blocked = checkMilestoneInvoiceable({
            name: milestone.name,
            status: milestone.status,
            billable: milestone.billable,
            amountMinor: milestone.amountMinor === null ? null : Number(milestone.amountMinor),
            alreadyInvoiced: milestone.invoiceLineId !== null,
          });
          if (blocked) throw new ActionError(blocked, "rule");
        }
        const project = milestones[0].project;
        const lines = milestones.map((milestone, position) => ({
          position,
          description: `${project.name}: ${milestone.name}`,
          quantityMilli: 1000,
          unitLabel: "milestone",
          unitPriceMinor: milestone.amountMinor as bigint,
          amountMinor: milestone.amountMinor as bigint,
          taxable: false,
        }));
        const total = lines.reduce((sum, line) => sum + Number(line.amountMinor), 0);
        const created = await tx.invoice.create({
          data: {
            clientName:
              project.organization?.name ??
              (project.contact ? fullName(project.contact) : project.name),
            clientEmail: project.contact?.email || null,
            clientAddress: project.organization?.address ?? null,
            organizationId: project.organizationId,
            contactId: project.contactId,
            dealId: project.dealId,
            projectId: project.id,
            issueDate: date(issue),
            dueDate: date(due),
            subtotalMinor: total,
            totalMinor: total,
            createdBy: actorId(actor),
            lines: { create: lines },
          },
          include: { lines: { orderBy: { position: "asc" } } },
        });
        for (const [index, milestone] of milestones.entries()) {
          await tx.milestone.update({
            where: { id: milestone.id },
            data: { invoiceLineId: created.lines[index].id },
          });
        }
        invoiceId = created.id;
      }
      await recordAudit(
        actor,
        {
          action: "invoice.create",
          entity: "invoice",
          entityId: invoiceId,
          summary: "Started a draft invoice",
        },
        tx,
      );
      return invoiceId;
    });
    refresh(id);
    return { id };
  });
}

export async function saveInvoice(input: InvoiceInput): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("invoices:create");
    const data = parse(invoiceSchema, input);

    const parsed = data.lines.map((line, index) => {
      const quantityMilli = parseQuantity(line.quantity);
      const unitPriceMinor = pesos(line.price, `line${index}`);
      return { ...line, quantityMilli: quantityMilli ?? 0, unitPriceMinor };
    });
    const invalid = checkDraft({
      clientName: data.clientName,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      lines: parsed,
    });
    if (invalid) {
      throw new ActionError(invalid.form ?? "Check the marked fields.", "validation", {
        ...(invalid.clientName ? { clientName: invalid.clientName } : {}),
        ...(invalid.issueDate ? { issueDate: invalid.issueDate } : {}),
        ...(invalid.dueDate ? { dueDate: invalid.dueDate } : {}),
        ...(invalid.form ? { form: invalid.form } : {}),
        ...Object.fromEntries(
          Object.entries(invalid.lines ?? {}).map(([index, message]) => [`line${index}`, message]),
        ),
      });
    }

    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: data.id },
        include: { lines: { select: { id: true, milestone: { select: { id: true } } } } },
      });
      if (!invoice) throw new ActionError("That invoice no longer exists.");
      if (invoice.status !== "draft")
        throw new ActionError(
          "An issued invoice can't be edited. Void it and make a new one.",
          "rule",
        );
      const rateBp = await taxRateFor(tx, data.taxCode);

      const priced = parsed.map((line) => ({
        ...line,
        amountMinor: lineAmount(line.quantityMilli, line.unitPriceMinor),
      }));
      const totals = invoiceTotals(priced, rateBp);

      // Lines that bill a milestone keep their milestone; removing one releases it (the database clears the link).
      const keep = new Map(
        invoice.lines.filter((line) => line.milestone).map((line) => [line.milestone!.id, line.id]),
      );
      void keep;
      await tx.invoiceLine.deleteMany({ where: { invoiceId: invoice.id } });
      const milestoneByPosition = invoice.lines.map((line) => line.milestone?.id ?? null);
      const created = await Promise.all(
        priced.map((line, position) =>
          tx.invoiceLine.create({
            data: {
              invoiceId: invoice.id,
              position,
              description: line.description.trim(),
              quantityMilli: line.quantityMilli,
              unitLabel: line.unitLabel || "item",
              unitPriceMinor: line.unitPriceMinor,
              amountMinor: line.amountMinor,
              taxable: line.taxable,
            },
          }),
        ),
      );
      // A milestone line stays a milestone line when its position still holds the same milestone.
      for (const [position, milestoneId] of milestoneByPosition.entries()) {
        if (milestoneId && created[position]) {
          await tx.milestone
            .update({ where: { id: milestoneId }, data: { invoiceLineId: created[position].id } })
            .catch(() => undefined);
        }
      }
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          organizationId: data.organizationId ?? invoice.organizationId,
          contactId: data.contactId ?? invoice.contactId,
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          clientAddress: data.clientAddress,
          clientTin: data.clientTin,
          issueDate: date(data.issueDate),
          dueDate: date(data.dueDate),
          taxCode: data.taxCode,
          taxRateBp: rateBp,
          subtotalMinor: totals.subtotalMinor,
          taxMinor: totals.taxMinor,
          totalMinor: totals.totalMinor,
          notes: data.notes,
          paymentInstructions: data.paymentInstructions,
        },
      });
      await recordAudit(
        actor,
        {
          action: "invoice.update",
          entity: "invoice",
          entityId: invoice.id,
          summary: "Edited a draft invoice",
        },
        tx,
      );
    });
    refresh(data.id);
  });
}

export async function deleteDraftInvoice(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("invoices:create");
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: parse(z.string().uuid(), id) } });
      if (!invoice) throw new ActionError("That invoice no longer exists.");
      if (invoice.status !== "draft")
        throw new ActionError(
          "Only a draft can be deleted. Void an issued invoice instead.",
          "rule",
        );
      await tx.invoice.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "invoice.delete",
          entity: "invoice",
          entityId: id,
          summary: `Deleted a draft invoice for ${invoice.clientName}`,
        },
        tx,
      );
    });
    refresh();
  });
}

/* ------------------------------------------------------- issuing and voiding */

/** Numbers the invoice, posts it to the books and freezes it. */
export async function issueInvoice(id: string): Promise<ActionResult<{ number: string }>> {
  return runAction(async () => {
    const actor = await guard("invoices:issue");
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: parse(z.string().uuid(), id) },
        include: { lines: true },
      });
      if (!invoice) throw new ActionError("That invoice no longer exists.");
      const blocked = checkIssue({
        status: invoice.status as InvoiceStatus,
        clientName: invoice.clientName,
        lineCount: invoice.lines.length,
        totalMinor: Number(invoice.totalMinor),
        issueDate: iso(invoice.issueDate),
        dueDate: iso(invoice.dueDate),
        today: today(),
      });
      if (blocked) throw new ActionError(blocked, "rule");

      const issueDate = iso(invoice.issueDate) as string;
      const number = await nextDocumentNumber(tx, "INV", Number(issueDate.slice(0, 4)));
      const subtotal = Number(invoice.subtotalMinor);
      const taxMinor = Number(invoice.taxMinor);
      const posted = await postJournal(tx, actor, {
        date: issueDate,
        memo: `Invoice ${number} to ${invoice.clientName}`,
        sourceKind: "invoice",
        sourceId: invoice.id,
        lines: [
          {
            accountId: await accountForRole(tx, "ar"),
            debitMinor: subtotal + taxMinor,
            creditMinor: 0,
          },
          {
            accountId: await accountForRole(tx, "revenue_services"),
            debitMinor: 0,
            creditMinor: subtotal,
          },
          ...(taxMinor > 0
            ? [
                {
                  accountId: await accountForRole(tx, "vat_payable"),
                  debitMinor: 0,
                  creditMinor: taxMinor,
                },
              ]
            : []),
        ],
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: "issued", number, journalEntryId: posted.id },
      });
      await recordAudit(
        actor,
        {
          action: "invoice.issue",
          entity: "invoice",
          entityId: invoice.id,
          summary: `Issued invoice ${number} for ${invoice.clientName}`,
        },
        tx,
      );
      return { number };
    });
    refresh(id);
    return result;
  });
}

export async function voidInvoice(input: { id: string; reason: string }): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("invoices:issue");
    const data = parse(voidSchema, input);
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: data.id },
        include: { lines: { select: { id: true } } },
      });
      if (!invoice) throw new ActionError("That invoice no longer exists.");
      const stand = (await standingsTx(tx, [invoice.id])).get(invoice.id)!;
      const blocked = checkVoidInvoice({
        status: invoice.status as InvoiceStatus,
        ...stand,
        reason: data.reason,
      });
      if (blocked) throw new ActionError(blocked, "rule", { reason: blocked });

      const reversal = await reverseJournal(tx, actor, invoice.journalEntryId as string, {
        reason: `Voided ${invoice.number}: ${data.reason}`,
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "void",
          voidedAt: new Date(),
          voidReason: data.reason,
          voidEntryId: reversal.id,
        },
      });
      // What it billed becomes billable again.
      await tx.milestone.updateMany({
        where: { invoiceLineId: { in: invoice.lines.map((line) => line.id) } },
        data: { invoiceLineId: null },
      });
      await recordAudit(
        actor,
        {
          action: "invoice.void",
          entity: "invoice",
          entityId: invoice.id,
          summary: `Voided invoice ${invoice.number}: ${data.reason}`,
        },
        tx,
      );
    });
    refresh(data.id);
  });
}

/* ----------------------------------------------------------------- payments */

/** Records money received and settles invoices with it. What it brings in beyond them is held as a customer deposit. */
export async function recordPayment(
  input: PaymentInput,
): Promise<ActionResult<{ id: string; number: string }>> {
  return runAction(async () => {
    const actor = await guard("invoices:settle");
    const data = parse(paymentSchema, input);
    const amountMinor = pesos(data.amount, "amount");
    const cwtMinor = pesos(data.cwt, "cwt");
    const allocations = data.allocations.map((allocation, index) => ({
      invoiceId: allocation.invoiceId,
      amountMinor: pesos(allocation.amount, `allocation${index}`),
    }));

    const created = await prisma.$transaction(async (tx) => {
      const invoices = await tx.invoice.findMany({
        where: { id: { in: allocations.map((a) => a.invoiceId) } },
      });
      const stand = await standingsTx(
        tx,
        invoices.map((invoice) => invoice.id),
      );
      const lookup = new Map(
        invoices.map((invoice) => [
          invoice.id,
          {
            status: invoice.status as InvoiceStatus,
            number: invoice.number,
            balanceMinor: balanceOf({
              totalMinor: Number(invoice.totalMinor),
              ...stand.get(invoice.id)!,
            }),
          },
        ]),
      );
      const invalid = checkPayment({
        amountMinor,
        cwtMinor,
        receivedDate: data.receivedDate,
        today: today(),
        allocations,
        invoices: lookup,
      });
      if (invalid) {
        throw new ActionError(
          invalid.form ??
            invalid.amount ??
            invalid.cwt ??
            invalid.date ??
            "Check the marked fields.",
          "validation",
          {
            ...(invalid.amount ? { amount: invalid.amount } : {}),
            ...(invalid.cwt ? { cwt: invalid.cwt } : {}),
            ...(invalid.date ? { receivedDate: invalid.date } : {}),
            ...(invalid.form ? { form: invalid.form } : {}),
            ...Object.fromEntries(
              Object.entries(invalid.allocations ?? {}).map(([invoiceId, message]) => [
                `allocation:${invoiceId}`,
                message,
              ]),
            ),
          },
        );
      }
      const deposit = await tx.account.findUnique({ where: { id: data.depositAccountId } });
      if (!deposit || !deposit.active || deposit.type !== "asset") {
        const message = "Choose the cash or bank account it went into.";
        throw new ActionError(message, "validation", { depositAccountId: message });
      }
      const clientName = invoices[0]?.clientName ?? data.clientName.trim();
      if (!clientName) {
        const message = "Say who paid.";
        throw new ActionError(message, "validation", { clientName: message });
      }

      const applied = allocations.reduce((sum, allocation) => sum + allocation.amountMinor, 0);
      const unapplied = amountMinor + cwtMinor - applied;
      const number = await nextDocumentNumber(tx, "RCT", Number(data.receivedDate.slice(0, 4)));
      const posted = await postJournal(tx, actor, {
        date: data.receivedDate,
        memo: `Payment ${number} from ${clientName}`,
        sourceKind: "payment",
        lines: [
          { accountId: deposit.id, debitMinor: amountMinor, creditMinor: 0 },
          ...(cwtMinor > 0
            ? [
                {
                  accountId: await accountForRole(tx, "cwt_receivable"),
                  debitMinor: cwtMinor,
                  creditMinor: 0,
                },
              ]
            : []),
          ...(applied > 0
            ? [{ accountId: await accountForRole(tx, "ar"), debitMinor: 0, creditMinor: applied }]
            : []),
          ...(unapplied > 0
            ? [
                {
                  accountId: await accountForRole(tx, "customer_deposits"),
                  debitMinor: 0,
                  creditMinor: unapplied,
                },
              ]
            : []),
        ],
      });
      const payment = await tx.payment.create({
        data: {
          number,
          receivedDate: date(data.receivedDate) as Date,
          amountMinor,
          cwtMinor,
          method: data.method,
          reference: data.reference,
          depositAccountId: deposit.id,
          organizationId: invoices[0]?.organizationId ?? null,
          contactId: invoices[0]?.contactId ?? null,
          clientName,
          note: data.note,
          journalEntryId: posted.id,
          createdBy: actorId(actor),
          allocations: {
            create: allocations.map((allocation) => ({
              invoiceId: allocation.invoiceId,
              amountMinor: allocation.amountMinor,
            })),
          },
        },
      });
      await recordAudit(
        actor,
        {
          action: "payment.record",
          entity: "payment",
          entityId: payment.id,
          summary: `Recorded payment ${number} of ₱${(amountMinor / 100).toFixed(2)} from ${clientName}`,
        },
        tx,
      );
      return { id: payment.id, number };
    });
    refresh();
    return created;
  });
}

export async function voidPayment(input: { id: string; reason: string }): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("invoices:settle");
    const data = parse(voidSchema, input);
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: data.id } });
      if (!payment) throw new ActionError("That payment no longer exists.");
      const blocked = checkVoidSettlement({ status: payment.status, reason: data.reason });
      if (blocked) throw new ActionError(blocked, "rule", { reason: blocked });
      const reversal = await reverseJournal(tx, actor, payment.journalEntryId, {
        reason: `Voided ${payment.number}: ${data.reason}`,
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "void",
          voidedAt: new Date(),
          voidReason: data.reason,
          voidEntryId: reversal.id,
        },
      });
      await recordAudit(
        actor,
        {
          action: "payment.void",
          entity: "payment",
          entityId: payment.id,
          summary: `Voided payment ${payment.number}: ${data.reason}`,
        },
        tx,
      );
    });
    refresh();
  });
}

/* -------------------------------------------------------------- credit notes */

export async function issueCreditNote(
  input: CreditNoteInput,
): Promise<ActionResult<{ id: string; number: string }>> {
  return runAction(async () => {
    const actor = await guard("invoices:settle");
    const data = parse(creditNoteSchema, input);
    const subtotalMinor = pesos(data.subtotal, "subtotal");

    const created = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: data.invoiceId } });
      if (!invoice) throw new ActionError("That invoice no longer exists.");
      const stand = (await standingsTx(tx, [invoice.id])).get(invoice.id)!;
      // Left blank, the tax follows the invoice's own rate.
      const taxMinor = data.tax.trim()
        ? pesos(data.tax, "tax")
        : invoice.taxRateBp > 0
          ? taxOf(subtotalMinor, invoice.taxRateBp)
          : 0;
      const invalid = checkCreditNote({
        invoiceStatus: invoice.status as InvoiceStatus,
        balanceMinor: balanceOf({ totalMinor: Number(invoice.totalMinor), ...stand }),
        subtotalMinor,
        taxMinor,
        reason: data.reason,
      });
      if (invalid) {
        throw new ActionError(
          invalid.form ??
            invalid.subtotal ??
            invalid.reason ??
            invalid.tax ??
            "Check the marked fields.",
          "validation",
          {
            ...(invalid.subtotal ? { subtotal: invalid.subtotal } : {}),
            ...(invalid.tax ? { tax: invalid.tax } : {}),
            ...(invalid.reason ? { reason: invalid.reason } : {}),
            ...(invalid.form ? { form: invalid.form } : {}),
          },
        );
      }
      const number = await nextDocumentNumber(tx, "CN", Number(data.issueDate.slice(0, 4)));
      const totalMinor = subtotalMinor + taxMinor;
      const posted = await postJournal(tx, actor, {
        date: data.issueDate,
        memo: `Credit note ${number} against ${invoice.number}: ${data.reason}`,
        sourceKind: "credit_note",
        sourceId: invoice.id,
        lines: [
          {
            accountId: await accountForRole(tx, "revenue_services"),
            debitMinor: subtotalMinor,
            creditMinor: 0,
          },
          ...(taxMinor > 0
            ? [
                {
                  accountId: await accountForRole(tx, "vat_payable"),
                  debitMinor: taxMinor,
                  creditMinor: 0,
                },
              ]
            : []),
          { accountId: await accountForRole(tx, "ar"), debitMinor: 0, creditMinor: totalMinor },
        ],
      });
      const note = await tx.creditNote.create({
        data: {
          number,
          invoiceId: invoice.id,
          issueDate: date(data.issueDate) as Date,
          reason: data.reason,
          subtotalMinor,
          taxMinor,
          totalMinor,
          journalEntryId: posted.id,
          createdBy: actorId(actor),
        },
      });
      await recordAudit(
        actor,
        {
          action: "credit_note.issue",
          entity: "invoice",
          entityId: invoice.id,
          summary: `Issued credit note ${number} of ₱${(totalMinor / 100).toFixed(2)} against ${invoice.number}`,
        },
        tx,
      );
      return { id: note.id, number };
    });
    refresh(data.invoiceId);
    return created;
  });
}

export async function voidCreditNote(input: { id: string; reason: string }): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("invoices:settle");
    const data = parse(voidSchema, input);
    let invoiceId = "";
    await prisma.$transaction(async (tx) => {
      const note = await tx.creditNote.findUnique({ where: { id: data.id } });
      if (!note) throw new ActionError("That credit note no longer exists.");
      invoiceId = note.invoiceId;
      const blocked = checkVoidSettlement({ status: note.status, reason: data.reason });
      if (blocked) throw new ActionError(blocked, "rule", { reason: blocked });
      const reversal = await reverseJournal(tx, actor, note.journalEntryId, {
        reason: `Voided ${note.number}: ${data.reason}`,
      });
      await tx.creditNote.update({
        where: { id: note.id },
        data: { status: "void", voidedAt: new Date(), voidEntryId: reversal.id },
      });
      await recordAudit(
        actor,
        {
          action: "credit_note.void",
          entity: "invoice",
          entityId: note.invoiceId,
          summary: `Voided credit note ${note.number}: ${data.reason}`,
        },
        tx,
      );
    });
    refresh(invoiceId);
  });
}

/* ------------------------------------------------------------ email and reminders */

/** Emails an issued invoice (with the PDF) to the client. */
export async function sendInvoice(input: {
  id: string;
  to?: string;
}): Promise<ActionResult<{ emailed: boolean }>> {
  return runAction(async () => {
    const actor = await guard("invoices:issue");
    const id = parse(z.string().uuid(), input.id);
    const invoice = await getInvoice(id, today());
    if (!invoice) throw new ActionError("That invoice no longer exists.");
    if (invoice.status !== "issued")
      throw new ActionError("Only an issued invoice can be sent.", "rule");
    const to = (input.to ?? invoice.clientEmail ?? "").trim();
    if (!to || !to.includes("@")) {
      throw new ActionError("This invoice has no email address to send to.", "validation", {
        to: "Add the client's email first.",
      });
    }
    const result = await sendInvoiceEmail({ to, invoice, senderName: actor.name });
    if (!result.ok) {
      throw new ActionError(
        result.reason === "not-configured"
          ? "Email isn't set up yet, so nothing was sent."
          : "The email couldn't be sent. Try again.",
      );
    }
    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({ where: { id }, data: { sentAt: new Date(), sentTo: to } });
      await recordAudit(
        actor,
        {
          action: "invoice.send",
          entity: "invoice",
          entityId: id,
          summary: `Emailed invoice ${invoice.number} to ${to}`,
        },
        tx,
      );
    });
    refresh(id);
    return { emailed: true };
  });
}

/** Sends the overdue reminder now, whatever the schedule says. */
export async function remindNow(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("invoices:issue");
    const invoice = await getInvoice(parse(z.string().uuid(), id), today());
    if (!invoice) throw new ActionError("That invoice no longer exists.");
    if (invoice.state !== "overdue")
      throw new ActionError("Only an overdue invoice needs a reminder.", "rule");
    if (!invoice.clientEmail)
      throw new ActionError("This invoice has no email address to send to.", "rule");
    const result = await sendInvoiceEmail({
      to: invoice.clientEmail,
      invoice,
      senderName: actor.name,
      reminder: true,
    });
    if (!result.ok) throw new ActionError("The reminder couldn't be sent.");
    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { reminderCount: { increment: 1 }, lastReminderAt: new Date() },
      });
      await recordAudit(
        actor,
        {
          action: "invoice.remind",
          entity: "invoice",
          entityId: invoice.id,
          summary: `Reminded ${invoice.clientName} about ${invoice.number}`,
        },
        tx,
      );
    });
    refresh(invoice.id);
  });
}
