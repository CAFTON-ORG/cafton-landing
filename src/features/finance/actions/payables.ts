"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { guard } from "@/features/crm/actions/guard";
import { addDays, manilaDate } from "@/features/schedule/slots";
import { ActionError, actorId, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { parseMinor } from "@/lib/money";
import { nextDocumentNumber } from "../documents";
import { checkVoidSettlement } from "../invoicing";
import { accountForRole, postJournal, reverseJournal } from "../ledger";
import {
  billPaymentSchema,
  billSchema,
  newBillSchema,
  vendorSchema,
  type BillInput,
  type BillPaymentInput,
  type NewBillInput,
  type VendorInput,
} from "../payable-schemas";
import {
  billBalance,
  billTotal,
  checkApproveBill,
  checkBillDraft,
  checkBillPayment,
  checkVendor,
  checkVoidBill,
  type BillStatus,
} from "../payables";
import { voidSchema } from "../invoice-schemas";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function refresh(id?: string) {
  for (const path of [
    "/dashboard/finance/vendors",
    "/dashboard/finance/bills",
    "/dashboard/finance/payables",
    "/dashboard/finance/journal",
    "/dashboard/audit",
  ]) {
    revalidatePath(path);
  }
  revalidatePath("/dashboard/finance/bills/[id]", "page");
  if (id) revalidatePath(`/dashboard/finance/bills/${id}`);
}

const today = () => manilaDate(new Date());
const date = (value: string) => new Date(`${value}T00:00:00Z`);
const iso = (value: Date) => value.toISOString().slice(0, 10);

function pesos(text: string, field: string): number {
  if (!text.trim()) return 0;
  const minor = parseMinor(text);
  if (minor === null) {
    const message = "Enter an amount like 1250 or 1,250.50.";
    throw new ActionError(message, "validation", { [field]: message });
  }
  return minor;
}

/** Cash and withheld tax already paid against a bill, read inside the caller's transaction. */
async function paidOn(tx: Tx, billId: string): Promise<number> {
  const sum = await tx.billPayment.aggregate({
    where: { billId, status: "recorded" },
    _sum: { amountMinor: true, whtMinor: true },
  });
  return Number(sum._sum.amountMinor ?? 0) + Number(sum._sum.whtMinor ?? 0);
}

/** An account a cost can be booked to: an active expense, or an asset such as prepaid expenses. */
async function assertCostAccount(tx: Tx, accountId: string) {
  const account = await tx.account.findUnique({ where: { id: accountId } });
  if (!account || !account.active || (account.type !== "expense" && account.type !== "asset")) {
    throw new ActionError("Choose an expense account that is switched on.", "validation");
  }
}

/* ------------------------------------------------------------------ vendors */

export async function saveVendor(input: VendorInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("payables:create");
    const data = parse(vendorSchema, input);
    const invalid = checkVendor({ name: data.name, email: data.email, termsDays: data.termsDays });
    if (invalid) {
      throw new ActionError(
        invalid.name ?? invalid.email ?? invalid.terms ?? "Check the marked fields.",
        "validation",
        {
          ...(invalid.name ? { name: invalid.name } : {}),
          ...(invalid.email ? { email: invalid.email } : {}),
          ...(invalid.terms ? { termsDays: invalid.terms } : {}),
        },
      );
    }
    const id = await prisma.$transaction(async (tx) => {
      const clash = await tx.vendor.findFirst({
        where: {
          name: { equals: data.name, mode: "insensitive" },
          ...(data.id ? { id: { not: data.id } } : {}),
        },
      });
      if (clash) {
        const message = `${clash.name} is already a supplier.`;
        throw new ActionError(message, "validation", { name: message });
      }
      if (data.defaultAccountId) await assertCostAccount(tx, data.defaultAccountId);
      const fields = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        tin: data.tin,
        defaultAccountId: data.defaultAccountId,
        termsDays: data.termsDays,
        notes: data.notes,
      };
      if (data.id) {
        const found = await tx.vendor.findUnique({ where: { id: data.id } });
        if (!found) throw new ActionError("That supplier no longer exists.");
        await tx.vendor.update({ where: { id: data.id }, data: fields });
        await recordAudit(
          actor,
          {
            action: "vendor.update",
            entity: "vendor",
            entityId: data.id,
            summary: `Edited the supplier ${data.name}`,
          },
          tx,
        );
        return data.id;
      }
      const created = await tx.vendor.create({ data: { ...fields, createdBy: actorId(actor) } });
      await recordAudit(
        actor,
        {
          action: "vendor.create",
          entity: "vendor",
          entityId: created.id,
          summary: `Added the supplier ${data.name}`,
        },
        tx,
      );
      return created.id;
    });
    refresh();
    return { id };
  });
}

/** Suppliers with bills are archived, never deleted. */
export async function setVendorActive(input: {
  id: string;
  active: boolean;
}): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("payables:create");
    const data = parse(z.object({ id: z.string().uuid(), active: z.boolean() }), input);
    await prisma.$transaction(async (tx) => {
      const vendor = await tx.vendor.findUnique({ where: { id: data.id } });
      if (!vendor) throw new ActionError("That supplier no longer exists.");
      await tx.vendor.update({ where: { id: data.id }, data: { active: data.active } });
      await recordAudit(
        actor,
        {
          action: data.active ? "vendor.restore" : "vendor.archive",
          entity: "vendor",
          entityId: data.id,
          summary: `${data.active ? "Restored" : "Archived"} the supplier ${vendor.name}`,
        },
        tx,
      );
    });
    refresh();
  });
}

/* -------------------------------------------------------------------- bills */

/** Starts an empty draft for a supplier, due on their usual terms. */
export async function createBill(input: NewBillInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("payables:create");
    const data = parse(newBillSchema, input);
    const id = await prisma.$transaction(async (tx) => {
      const vendor = await tx.vendor.findUnique({ where: { id: data.vendorId } });
      if (!vendor || !vendor.active)
        throw new ActionError("Choose a supplier that is still active.");
      const billDate = today();
      const bill = await tx.bill.create({
        data: {
          vendorId: vendor.id,
          vendorName: vendor.name,
          billDate: date(billDate),
          dueDate: date(addDays(billDate, vendor.termsDays)),
          createdBy: actorId(actor),
        },
      });
      await recordAudit(
        actor,
        {
          action: "bill.create",
          entity: "bill",
          entityId: bill.id,
          summary: `Started a draft bill from ${vendor.name}`,
        },
        tx,
      );
      return bill.id;
    });
    refresh(id);
    return { id };
  });
}

export async function saveBill(input: BillInput): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("payables:create");
    const data = parse(billSchema, input);
    const parsed = data.lines.map((line, index) => ({
      description: line.description,
      accountId: line.accountId,
      amountMinor: pesos(line.amount, `line${index}`),
    }));
    const invalid = checkBillDraft({
      vendorId: data.vendorId,
      billDate: data.billDate,
      dueDate: data.dueDate,
      lines: parsed,
    });
    if (invalid) {
      throw new ActionError(invalid.form ?? "Check the marked fields.", "validation", {
        ...(invalid.vendor ? { vendorId: invalid.vendor } : {}),
        ...(invalid.billDate ? { billDate: invalid.billDate } : {}),
        ...(invalid.dueDate ? { dueDate: invalid.dueDate } : {}),
        ...(invalid.form ? { form: invalid.form } : {}),
        ...Object.fromEntries(
          Object.entries(invalid.lines ?? {}).map(([index, message]) => [`line${index}`, message]),
        ),
      });
    }
    await prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findUnique({ where: { id: data.id } });
      if (!bill) throw new ActionError("That bill no longer exists.");
      if (bill.status !== "draft")
        throw new ActionError(
          "An approved bill can't be edited. Void it and enter it again.",
          "rule",
        );
      const vendor = await tx.vendor.findUnique({ where: { id: data.vendorId } });
      if (!vendor) throw new ActionError("That supplier no longer exists.");
      for (const accountId of new Set(parsed.map((line) => line.accountId)))
        await assertCostAccount(tx, accountId);

      await tx.billLine.deleteMany({ where: { billId: bill.id } });
      await tx.billLine.createMany({
        data: parsed.map((line, position) => ({
          billId: bill.id,
          position,
          description: line.description.trim(),
          accountId: line.accountId,
          amountMinor: line.amountMinor,
        })),
      });
      await tx.bill.update({
        where: { id: bill.id },
        data: {
          vendorId: vendor.id,
          vendorName: vendor.name,
          vendorRef: data.vendorRef,
          billDate: date(data.billDate),
          dueDate: date(data.dueDate),
          totalMinor: billTotal(parsed),
          notes: data.notes,
        },
      });
      await recordAudit(
        actor,
        {
          action: "bill.update",
          entity: "bill",
          entityId: bill.id,
          summary: "Edited a draft bill",
        },
        tx,
      );
    });
    refresh(data.id);
  });
}

export async function deleteDraftBill(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("payables:create");
    await prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findUnique({ where: { id: parse(z.string().uuid(), id) } });
      if (!bill) throw new ActionError("That bill no longer exists.");
      if (bill.status !== "draft")
        throw new ActionError(
          "Only a draft can be deleted. Void an approved bill instead.",
          "rule",
        );
      await tx.bill.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "bill.delete",
          entity: "bill",
          entityId: id,
          summary: `Deleted a draft bill from ${bill.vendorName}`,
        },
        tx,
      );
    });
    refresh();
  });
}

/** Numbers the bill, posts it to the books (Dr what it was for, Cr accounts payable) and fixes it. */
export async function approveBill(id: string): Promise<ActionResult<{ number: string }>> {
  return runAction(async () => {
    const actor = await guard("payables:approve");
    const result = await prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findUnique({
        where: { id: parse(z.string().uuid(), id) },
        include: { lines: true, vendor: true },
      });
      if (!bill) throw new ActionError("That bill no longer exists.");
      const blocked = checkApproveBill({
        status: bill.status as BillStatus,
        vendorActive: bill.vendor.active,
        lineCount: bill.lines.length,
        totalMinor: Number(bill.totalMinor),
        billDate: iso(bill.billDate),
        today: today(),
      });
      if (blocked) throw new ActionError(blocked, "rule");
      for (const accountId of new Set(bill.lines.map((line) => line.accountId)))
        await assertCostAccount(tx, accountId);

      const billDate = iso(bill.billDate);
      const number = await nextDocumentNumber(tx, "BILL", Number(billDate.slice(0, 4)));
      const byAccount = new Map<string, number>();
      for (const line of bill.lines) {
        byAccount.set(
          line.accountId,
          (byAccount.get(line.accountId) ?? 0) + Number(line.amountMinor),
        );
      }
      const total = billTotal([...byAccount.values()].map((amountMinor) => ({ amountMinor })));
      const posted = await postJournal(tx, actor, {
        date: billDate,
        memo: `Bill ${number} from ${bill.vendor.name}${bill.vendorRef ? ` (${bill.vendorRef})` : ""}`,
        sourceKind: "bill",
        sourceId: bill.id,
        lines: [
          ...[...byAccount.entries()].map(([accountId, amountMinor]) => ({
            accountId,
            debitMinor: amountMinor,
            creditMinor: 0,
          })),
          { accountId: await accountForRole(tx, "ap"), debitMinor: 0, creditMinor: total },
        ],
      });
      await tx.bill.update({
        where: { id: bill.id },
        data: {
          status: "approved",
          number,
          vendorName: bill.vendor.name,
          journalEntryId: posted.id,
          approvedBy: actorId(actor),
          approvedAt: new Date(),
        },
      });
      await recordAudit(
        actor,
        {
          action: "bill.approve",
          entity: "bill",
          entityId: bill.id,
          summary: `Approved bill ${number} from ${bill.vendor.name}`,
        },
        tx,
      );
      return { number };
    });
    refresh(id);
    return result;
  });
}

export async function voidBill(input: { id: string; reason: string }): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("payables:approve");
    const data = parse(voidSchema, input);
    await prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findUnique({ where: { id: data.id } });
      if (!bill) throw new ActionError("That bill no longer exists.");
      const blocked = checkVoidBill({
        status: bill.status as BillStatus,
        paidMinor: await paidOn(tx, bill.id),
        reason: data.reason,
      });
      if (blocked) throw new ActionError(blocked, "rule", { reason: blocked });
      const reversal = await reverseJournal(tx, actor, bill.journalEntryId as string, {
        reason: `Voided ${bill.number}: ${data.reason}`,
      });
      await tx.bill.update({
        where: { id: bill.id },
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
          action: "bill.void",
          entity: "bill",
          entityId: bill.id,
          summary: `Voided bill ${bill.number}: ${data.reason}`,
        },
        tx,
      );
    });
    refresh(data.id);
  });
}

/* ----------------------------------------------------------------- payments */

/** Records money paid to a supplier; tax held back from them is set aside to remit. */
export async function payBill(
  input: BillPaymentInput,
): Promise<ActionResult<{ id: string; number: string }>> {
  return runAction(async () => {
    const actor = await guard("payables:pay");
    const data = parse(billPaymentSchema, input);
    const amountMinor = pesos(data.amount, "amount");
    const whtMinor = pesos(data.wht, "wht");

    const created = await prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findUnique({ where: { id: data.billId } });
      if (!bill) throw new ActionError("That bill no longer exists.");
      const balanceMinor = billBalance({
        totalMinor: Number(bill.totalMinor),
        paidMinor: await paidOn(tx, bill.id),
      });
      const invalid = checkBillPayment({
        billStatus: bill.status as BillStatus,
        balanceMinor,
        amountMinor,
        whtMinor,
        paidDate: data.paidDate,
        today: today(),
      });
      if (invalid) {
        throw new ActionError(
          invalid.form ??
            invalid.amount ??
            invalid.wht ??
            invalid.date ??
            "Check the marked fields.",
          "validation",
          {
            ...(invalid.amount ? { amount: invalid.amount } : {}),
            ...(invalid.wht ? { wht: invalid.wht } : {}),
            ...(invalid.date ? { paidDate: invalid.date } : {}),
            ...(invalid.form ? { form: invalid.form } : {}),
          },
        );
      }
      const from = await tx.account.findUnique({ where: { id: data.paidFromAccountId } });
      if (!from || !from.active || from.type !== "asset") {
        const message = "Choose the cash or bank account it was paid from.";
        throw new ActionError(message, "validation", { paidFromAccountId: message });
      }
      const number = await nextDocumentNumber(tx, "BPAY", Number(data.paidDate.slice(0, 4)));
      const posted = await postJournal(tx, actor, {
        date: data.paidDate,
        memo: `Payment ${number} to ${bill.vendorName} for ${bill.number}`,
        sourceKind: "bill",
        sourceId: bill.id,
        lines: [
          {
            accountId: await accountForRole(tx, "ap"),
            debitMinor: amountMinor + whtMinor,
            creditMinor: 0,
          },
          { accountId: from.id, debitMinor: 0, creditMinor: amountMinor },
          ...(whtMinor > 0
            ? [
                {
                  accountId: await accountForRole(tx, "withholding_payable"),
                  debitMinor: 0,
                  creditMinor: whtMinor,
                },
              ]
            : []),
        ],
      });
      const payment = await tx.billPayment.create({
        data: {
          number,
          billId: bill.id,
          paidDate: date(data.paidDate),
          amountMinor,
          whtMinor,
          method: data.method,
          reference: data.reference,
          paidFromAccountId: from.id,
          note: data.note,
          journalEntryId: posted.id,
          createdBy: actorId(actor),
        },
      });
      await recordAudit(
        actor,
        {
          action: "bill.pay",
          entity: "bill",
          entityId: bill.id,
          summary: `Paid ${bill.vendorName} ₱${(amountMinor / 100).toFixed(2)} for ${bill.number}`,
        },
        tx,
      );
      return { id: payment.id, number };
    });
    refresh(data.billId);
    return created;
  });
}

export async function voidBillPayment(input: {
  id: string;
  reason: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("payables:pay");
    const data = parse(voidSchema, input);
    let billId = "";
    await prisma.$transaction(async (tx) => {
      const payment = await tx.billPayment.findUnique({ where: { id: data.id } });
      if (!payment) throw new ActionError("That payment no longer exists.");
      billId = payment.billId;
      const blocked = checkVoidSettlement({ status: payment.status, reason: data.reason });
      if (blocked) throw new ActionError(blocked, "rule", { reason: blocked });
      const reversal = await reverseJournal(tx, actor, payment.journalEntryId, {
        reason: `Voided ${payment.number}: ${data.reason}`,
      });
      await tx.billPayment.update({
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
          action: "bill.payment.void",
          entity: "bill",
          entityId: payment.billId,
          summary: `Voided payment ${payment.number}: ${data.reason}`,
        },
        tx,
      );
    });
    refresh(billId);
  });
}
