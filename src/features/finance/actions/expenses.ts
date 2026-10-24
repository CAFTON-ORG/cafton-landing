"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { detectFileType, sanitizeFileName } from "@/features/crm/rules/files";
import { guard } from "@/features/crm/actions/guard";
import { notify, staffIdsWith } from "@/features/notifications/services/notify";
import { manilaDate } from "@/features/schedule/rules/slots";
import { ActionError, parse, runAction, type ActionResult } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { can } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { parseMinor } from "@/lib/money";
import { ImageRejected, sanitizeImage } from "@/lib/security/image";
import { createAdminClient, isAdminStorageConfigured } from "@/lib/supabase/admin";
import { nextDocumentNumber } from "../services/documents";
import { expenseSchema, reasonSchema, type ExpenseInput } from "../schemas/expenses";
import type { ReceiptView } from "../types/expenses";
import {
  checkApproveExpense,
  checkEditExpense,
  checkExpense,
  checkReceiptUpload,
  checkRejectExpense,
  checkVoidExpense,
  checkWithdrawExpense,
  newReceiptPath,
  RECEIPTS_BUCKET,
  type ExpenseStatus,
} from "../rules/expenses";
import { postJournal, reverseJournal } from "../services/ledger";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function refresh(id?: string) {
  revalidatePath("/dashboard/finance/expenses");
  revalidatePath("/dashboard/finance/journal");
  revalidatePath("/dashboard/audit");
  revalidatePath("/dashboard/finance/expenses/[id]", "page");
  if (id) revalidatePath(`/dashboard/finance/expenses/${id}`);
}

const today = () => manilaDate(new Date());
const date = (value: string) => new Date(`${value}T00:00:00Z`);
const iso = (value: Date) => value.toISOString().slice(0, 10);
const link = (id: string) => `/dashboard/finance/expenses/${id}`;

/** The accounts an expense may use: a cost (expense or asset) booked, money from cash/bank or reimbursements. */
async function assertAccounts(tx: Tx, accountId: string, paidFromAccountId: string) {
  const [cost, paidFrom] = await Promise.all([
    tx.account.findUnique({ where: { id: accountId } }),
    tx.account.findUnique({ where: { id: paidFromAccountId } }),
  ]);
  if (!cost || !cost.active || (cost.type !== "expense" && cost.type !== "asset")) {
    const message = "Choose an expense account that is switched on.";
    throw new ActionError(message, "validation", { accountId: message });
  }
  const fine =
    paidFrom &&
    paidFrom.active &&
    (paidFrom.type === "asset" || paidFrom.systemKey === "reimbursable");
  if (!fine) {
    const message = "Choose cash, a bank account, or reimbursements.";
    throw new ActionError(message, "validation", { paidFromAccountId: message });
  }
}

/* --------------------------------------------------------------- submitting */

/** Submits an expense for approval, or (with an id) edits one that is waiting or was sent back. */
export async function saveExpense(input: ExpenseInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await guard("expenses:submit");
    const data = parse(expenseSchema, input);
    const amountMinor = data.amount.trim() ? (parseMinor(data.amount) ?? 0) : 0;
    const invalid = checkExpense({
      payee: data.payee,
      description: data.description,
      accountId: data.accountId,
      paidFromAccountId: data.paidFromAccountId,
      amountMinor,
      date: data.expenseDate,
      today: today(),
    });
    if (invalid) {
      throw new ActionError("Check the marked fields.", "validation", {
        ...(invalid.payee ? { payee: invalid.payee } : {}),
        ...(invalid.description ? { description: invalid.description } : {}),
        ...(invalid.account ? { accountId: invalid.account } : {}),
        ...(invalid.paidFrom ? { paidFromAccountId: invalid.paidFrom } : {}),
        ...(invalid.amount ? { amount: invalid.amount } : {}),
        ...(invalid.date ? { expenseDate: invalid.date } : {}),
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await assertAccounts(tx, data.accountId, data.paidFromAccountId);
      const fields = {
        expenseDate: date(data.expenseDate),
        payee: data.payee,
        vendorId: data.vendorId,
        description: data.description,
        accountId: data.accountId,
        amountMinor,
        paidFromAccountId: data.paidFromAccountId,
        notes: data.notes,
      };
      if (data.id) {
        const found = await tx.expense.findUnique({ where: { id: data.id } });
        if (!found) throw new ActionError("That expense no longer exists.");
        const blocked = checkEditExpense({
          status: found.status as ExpenseStatus,
          submittedBy: found.submittedBy,
          actorId: actor.id,
        });
        if (blocked) throw new ActionError(blocked, "rule");
        // Editing a rejected expense sends it back for another look.
        await tx.expense.update({
          where: { id: data.id },
          data: {
            ...fields,
            status: "submitted",
            rejectReason: null,
            decidedBy: null,
            decidedByName: null,
            decidedAt: null,
          },
        });
        await recordAudit(
          actor,
          {
            action: "expense.update",
            entity: "expense",
            entityId: data.id,
            summary: `Edited the expense for ${data.payee}`,
          },
          tx,
        );
        return { id: data.id, created: false };
      }
      const created = await tx.expense.create({
        data: { ...fields, submittedBy: actor.id, submittedByName: actor.name },
      });
      await recordAudit(
        actor,
        {
          action: "expense.submit",
          entity: "expense",
          entityId: created.id,
          summary: `Submitted an expense for ${data.payee}: ₱${(amountMinor / 100).toFixed(2)}`,
        },
        tx,
      );
      return { id: created.id, created: true };
    });

    // After the change is saved: a notification must never hold the transaction open.
    if (result.created) {
      await notify(
        await staffIdsWith("expenses:approve"),
        {
          kind: "expense.submitted",
          title: `${actor.name} submitted an expense`,
          body: `${data.payee}: ₱${(amountMinor / 100).toFixed(2)}`,
          href: link(result.id),
        },
        actor.id,
      );
    }
    refresh(result.id);
    return { id: result.id };
  });
}

/** Deletes an expense that has not been approved: its submitter's, or an approver's. */
export async function withdrawExpense(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("expenses:submit");
    const paths: string[] = [];
    await prisma.$transaction(async (tx) => {
      const found = await tx.expense.findUnique({
        where: { id: parse(z.string().uuid(), id) },
        include: { receipts: true },
      });
      if (!found) throw new ActionError("That expense no longer exists.");
      const blocked = checkWithdrawExpense({
        status: found.status as ExpenseStatus,
        submittedBy: found.submittedBy,
        actorId: actor.id,
        canApprove: can(actor, "expenses:approve"),
      });
      if (blocked) throw new ActionError(blocked, "rule");
      paths.push(...found.receipts.map((receipt) => receipt.path));
      await tx.expense.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "expense.withdraw",
          entity: "expense",
          entityId: id,
          summary: `Withdrew the expense for ${found.payee}`,
        },
        tx,
      );
    });
    if (paths.length > 0 && isAdminStorageConfigured) {
      await createAdminClient()
        .storage.from(RECEIPTS_BUCKET)
        .remove(paths)
        .catch(() => undefined);
    }
    refresh();
  });
}

/* ---------------------------------------------------------------- deciding */

/** Numbers the expense, posts it (Dr what it was for, Cr where the money came from) and fixes it. */
export async function approveExpense(id: string): Promise<ActionResult<{ number: string }>> {
  return runAction(async () => {
    const actor = await guard("expenses:approve");
    const done = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findUnique({
        where: { id: parse(z.string().uuid(), id) },
        include: { _count: { select: { receipts: true } } },
      });
      if (!expense) throw new ActionError("That expense no longer exists.");
      const blocked = checkApproveExpense({
        status: expense.status as ExpenseStatus,
        amountMinor: Number(expense.amountMinor),
        receiptCount: expense._count.receipts,
      });
      if (blocked) throw new ActionError(blocked, "rule");
      await assertAccounts(tx, expense.accountId, expense.paidFromAccountId);

      const expenseDate = iso(expense.expenseDate);
      const number = await nextDocumentNumber(tx, "EXP", Number(expenseDate.slice(0, 4)));
      const amount = Number(expense.amountMinor);
      const posted = await postJournal(tx, actor, {
        date: expenseDate,
        memo: `Expense ${number}: ${expense.description} (${expense.payee})`,
        sourceKind: "expense",
        sourceId: expense.id,
        lines: [
          { accountId: expense.accountId, debitMinor: amount, creditMinor: 0 },
          { accountId: expense.paidFromAccountId, debitMinor: 0, creditMinor: amount },
        ],
      });
      await tx.expense.update({
        where: { id: expense.id },
        data: {
          status: "approved",
          number,
          journalEntryId: posted.id,
          decidedBy: actor.id,
          decidedByName: actor.name,
          decidedAt: new Date(),
        },
      });
      await recordAudit(
        actor,
        {
          action: "expense.approve",
          entity: "expense",
          entityId: expense.id,
          summary: `Approved expense ${number} for ${expense.payee}`,
        },
        tx,
      );
      return { number, submittedBy: expense.submittedBy };
    });
    await notify(
      [done.submittedBy],
      {
        kind: "expense.approved",
        title: `Your expense ${done.number} was approved`,
        href: link(id),
      },
      actor.id,
    );
    refresh(id);
    return { number: done.number };
  });
}

export async function rejectExpense(input: { id: string; reason: string }): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("expenses:approve");
    const data = parse(reasonSchema, input);
    const submittedBy = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findUnique({ where: { id: data.id } });
      if (!expense) throw new ActionError("That expense no longer exists.");
      const blocked = checkRejectExpense({
        status: expense.status as ExpenseStatus,
        reason: data.reason,
      });
      if (blocked) throw new ActionError(blocked, "rule", { reason: blocked });
      await tx.expense.update({
        where: { id: expense.id },
        data: {
          status: "rejected",
          rejectReason: data.reason,
          decidedBy: actor.id,
          decidedByName: actor.name,
          decidedAt: new Date(),
        },
      });
      await recordAudit(
        actor,
        {
          action: "expense.reject",
          entity: "expense",
          entityId: expense.id,
          summary: `Sent back the expense for ${expense.payee}: ${data.reason}`,
        },
        tx,
      );
      return expense.submittedBy;
    });
    await notify(
      [submittedBy],
      {
        kind: "expense.rejected",
        title: "Your expense needs changes",
        body: data.reason,
        href: link(data.id),
      },
      actor.id,
    );
    refresh(data.id);
  });
}

export async function voidExpense(input: { id: string; reason: string }): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("expenses:approve");
    const data = parse(reasonSchema, input);
    await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findUnique({ where: { id: data.id } });
      if (!expense) throw new ActionError("That expense no longer exists.");
      const blocked = checkVoidExpense({
        status: expense.status as ExpenseStatus,
        reason: data.reason,
      });
      if (blocked) throw new ActionError(blocked, "rule", { reason: blocked });
      const reversal = await reverseJournal(tx, actor, expense.journalEntryId as string, {
        reason: `Voided ${expense.number}: ${data.reason}`,
      });
      await tx.expense.update({
        where: { id: expense.id },
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
          action: "expense.void",
          entity: "expense",
          entityId: expense.id,
          summary: `Voided expense ${expense.number}: ${data.reason}`,
        },
        tx,
      );
    });
    refresh(data.id);
  });
}

/* ----------------------------------------------------------------- receipts */

/**
 * Adds one receipt (a photo or PDF) to an expense that has not been approved. The file is checked
 * by its bytes, photos are re-encoded without metadata, and it is stored under a random name in a
 * private bucket: nothing the uploader typed becomes part of a path.
 */
export async function uploadReceipt(formData: FormData): Promise<ActionResult<ReceiptView>> {
  return runAction(async () => {
    const actor = await guard("expenses:submit");
    const expenseId = parse(z.string().uuid(), formData.get("expenseId"));
    if (!isAdminStorageConfigured) {
      throw new ActionError(
        "File storage isn't set up yet. Add the Supabase environment variables, including SUPABASE_SERVICE_ROLE_KEY, to turn uploads on.",
      );
    }
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ActionError("Choose a file to upload.");

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { _count: { select: { receipts: true } } },
    });
    if (!expense) throw new ActionError("That expense no longer exists.");
    if (expense.submittedBy !== actor.id && !can(actor, "expenses:approve")) {
      throw new ActionError(
        "Only the person who submitted an expense can add receipts to it.",
        "rule",
      );
    }
    const refused = checkReceiptUpload(
      file,
      expense._count.receipts,
      expense.status as ExpenseStatus,
    );
    if (refused) throw new ActionError(refused, "rule", { file: refused });

    const bytes = Buffer.from(await file.arrayBuffer());
    const detected = detectFileType(file.name, bytes);
    if (!detected.ok) throw new ActionError(`${file.name}: ${detected.reason}`, "rule");
    if (detected.type.kind !== "pdf" && detected.type.kind !== "image") {
      throw new ActionError("A receipt is a photo or a PDF.", "rule");
    }

    let data: Buffer = bytes;
    let { mime, ext } = detected.type;
    if (detected.type.kind === "image") {
      try {
        const clean = await sanitizeImage(bytes);
        data = clean.data;
        mime = clean.mime;
        ext = clean.extension;
      } catch (error) {
        if (error instanceof ImageRejected) throw new ActionError(`${file.name}: ${error.message}`);
        throw error;
      }
    }

    const path = newReceiptPath(ext);
    const storage = createAdminClient().storage.from(RECEIPTS_BUCKET);
    const { error } = await storage.upload(path, data, {
      contentType: mime,
      cacheControl: "0",
      upsert: false,
    });
    if (error) {
      console.error("Receipt upload failed", error);
      throw new ActionError("Couldn't store the file. Check your connection and try again.");
    }

    const name = sanitizeFileName(file.name);
    let row;
    try {
      row = await prisma.$transaction(async (tx) => {
        const created = await tx.expenseReceipt.create({
          data: {
            expenseId,
            path,
            name,
            mime,
            sizeBytes: data.length,
            uploadedBy: actor.id,
            uploadedByName: actor.name,
          },
        });
        await recordAudit(
          actor,
          {
            action: "expense.receipt.add",
            entity: "expense",
            entityId: expenseId,
            summary: `Added the receipt ${name}`,
          },
          tx,
        );
        return created;
      });
    } catch (dbError) {
      await storage.remove([path]); // never leave a file no expense can see
      throw dbError;
    }
    refresh(expenseId);
    return {
      id: row.id,
      name: row.name,
      mime: row.mime,
      sizeBytes: row.sizeBytes,
      uploadedByName: row.uploadedByName,
      uploadedBy: row.uploadedBy ?? undefined,
      createdAt: row.createdAt.toISOString(),
    };
  });
}

export async function deleteReceipt(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await guard("expenses:submit");
    const found = await prisma.expenseReceipt.findUnique({
      where: { id: parse(z.string().uuid(), id) },
      include: { expense: true },
    });
    if (!found) throw new ActionError("That receipt no longer exists.");
    if (found.expense.status === "approved" || found.expense.status === "void") {
      throw new ActionError("Receipts can't be changed once an expense is approved.", "rule");
    }
    if (found.expense.submittedBy !== actor.id && !can(actor, "expenses:approve")) {
      throw new ActionError(
        "Only the person who submitted an expense can remove its receipts.",
        "rule",
      );
    }
    // The stored object first: if that fails the receipt is still listed and can be removed again.
    const { error } = await createAdminClient().storage.from(RECEIPTS_BUCKET).remove([found.path]);
    if (error) {
      console.error("Receipt removal failed", error);
      throw new ActionError("Couldn't remove the file from storage. Please try again.");
    }
    await prisma.$transaction(async (tx) => {
      await tx.expenseReceipt.delete({ where: { id } });
      await recordAudit(
        actor,
        {
          action: "expense.receipt.remove",
          entity: "expense",
          entityId: found.expenseId,
          summary: `Removed the receipt ${found.name}`,
        },
        tx,
      );
    });
    refresh(found.expenseId);
  });
}
