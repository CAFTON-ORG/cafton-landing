import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../../../scripts/pglite-setup.mjs";
import { SYSTEM_ROLE_PERMISSIONS, type Permission } from "@/lib/auth/permissions";

/**
 * Invoicing against a real Postgres (PGlite) built from the real migrations: what issuing, paying,
 * crediting and voiding do to the books, and that the database itself keeps an issued invoice
 * frozen and refuses a payment that settles more than it brought in.
 */

const person = (id: string, roleKey: "owner" | "sales") => ({
  id,
  name: `${roleKey} ${id.slice(0, 4)}`,
  email: `${roleKey}-${id.slice(0, 4)}@cafton.com`,
  roleKey,
  roleName: roleKey,
  permissions: SYSTEM_ROLE_PERMISSIONS[roleKey],
});
const OWNER = person("55555555-5555-4555-8555-555555555555", "owner");
const SALES = person("77777777-7777-4777-8777-777777777777", "sales");
let current = OWNER;

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/auth/dal", () => ({
  requirePermission: vi.fn(async (permission: Permission) => {
    if (!current.permissions.includes(permission)) {
      const { ForbiddenError } = await import("@/lib/actions");
      throw new ForbiddenError();
    }
    return current;
  }),
  verifySession: vi.fn(async () => current),
  can: (staff: { permissions: readonly string[] }, permission: Permission) =>
    staff.permissions.includes(permission),
}));

let db: PGlite;
let server: PGLiteSocketServer;
let prisma: typeof import("@/lib/db").prisma;
let actions: typeof import("./actions/invoices");
let repo: typeof import("./invoice-repository");
let books: typeof import("./repository");

beforeAll(async () => {
  db = (await createDatabase()) as PGlite;
  server = new PGLiteSocketServer({ db, port: 0, host: "127.0.0.1", maxConnections: 4 });
  await server.start();
  const port = (server as unknown as { server: { address(): { port: number } } }).server.address()
    .port;
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_POOL_MAX = "1";
  for (const user of [OWNER, SALES]) {
    await db
      .exec(`INSERT INTO auth.users (id, email) VALUES ('${user.id}', '${user.email}')`)
      .catch(() => undefined);
    await db.exec(
      `INSERT INTO profiles (id, email, full_name, role_id)
       SELECT '${user.id}', '${user.email}', '${user.name}', id FROM roles WHERE key = '${user.roleKey}' ON CONFLICT DO NOTHING`,
    );
  }
  ({ prisma } = await import("@/lib/db"));
  actions = await import("./actions/invoices");
  repo = await import("./invoice-repository");
  books = await import("./repository");
}, 120_000);

afterAll(async () => {
  await server?.stop();
  await db?.close();
});

const idOf = (result: unknown) => (result as { data: { id: string } }).data.id;
const today = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);

/** What the books say an account holds, debit positive. */
async function balance(code: string) {
  const row = (await books.trialBalance(today())).find((item) => item.code === code);
  return row ? row.debitMinor - row.creditMinor : 0;
}
const roleCode = async (key: string) =>
  (await prisma.account.findFirstOrThrow({ where: { systemKey: key } })).code;

const line = (price: string, taxable = false) => ({
  description: "Website build",
  quantity: "1",
  unitLabel: "item",
  price,
  taxable,
});

/** A saved draft ready to issue. */
async function draft(price = "10,000", client = "Acme Corp", taxCode = "NOVAT", taxable = false) {
  const created = await actions.createInvoice({ source: "blank", clientName: client });
  if (!created.ok) throw new Error(created.error);
  const id = created.data!.id;
  const saved = await actions.saveInvoice({
    id,
    clientName: client,
    issueDate: today(),
    dueDate: today(),
    taxCode,
    lines: [line(price, taxable)],
  });
  if (!saved.ok) throw new Error(saved.error);
  return id;
}

async function issued(...args: Parameters<typeof draft>) {
  const id = await draft(...args);
  const result = await actions.issueInvoice(id);
  if (!result.ok) throw new Error(result.error);
  return { id, number: result.data!.number };
}

async function bankAccountId() {
  return (await prisma.account.findUniqueOrThrow({ where: { code: await roleCode("bank") } })).id;
}

async function pay(
  invoiceId: string,
  amount: string,
  extra: { cwt?: string; allocate?: string } = {},
) {
  return actions.recordPayment({
    receivedDate: today(),
    amount,
    cwt: extra.cwt ?? "",
    method: "bank_transfer",
    depositAccountId: await bankAccountId(),
    allocations: [{ invoiceId, amount: extra.allocate ?? amount }],
  });
}

describe("issuing", () => {
  it("numbers the invoice, posts it to the books and freezes it", async () => {
    const ar = await roleCode("ar");
    const revenue = await roleCode("revenue_services");
    const before = [await balance(ar), await balance(revenue)];

    const { id, number } = await issued("10,000");
    expect(number).toMatch(/^INV-\d{4}-\d{4}$/);

    expect(await balance(ar)).toBe(before[0] + 1_000_000);
    expect(await balance(revenue)).toBe(before[1] - 1_000_000);

    const invoice = await repo.getInvoice(id, today());
    expect(invoice).toMatchObject({ status: "issued", number, balanceMinor: 1_000_000 });
    expect(invoice?.journalEntryId).toBeTruthy();

    // The application refuses an edit with a reason...
    const edit = await actions.saveInvoice({
      id,
      clientName: "Someone else",
      issueDate: today(),
      dueDate: today(),
      lines: [line("1")],
    });
    expect(edit).toMatchObject({ ok: false });
    // ...and so does the database, whatever the application does.
    await expect(
      prisma.$executeRaw`UPDATE invoices SET total_minor = 1 WHERE id = ${id}::uuid`,
    ).rejects.toThrow(/issued invoice/i);
    await expect(
      prisma.$executeRaw`DELETE FROM invoice_lines WHERE invoice_id = ${id}::uuid`,
    ).rejects.toThrow(/lines of an issued invoice/i);
  });

  it("posts the tax the invoice charges to output VAT payable", async () => {
    await prisma.taxRate.update({ where: { code: "VAT12" }, data: { active: true } });
    const vat = await roleCode("vat_payable");
    const before = await balance(vat);
    const { id } = await issued("1,000", "Taxed Client", "VAT12", true);
    expect(await balance(vat)).toBe(before - 12_000);
    expect(await repo.getInvoice(id, today())).toMatchObject({
      subtotalMinor: 100_000,
      taxMinor: 12_000,
      totalMinor: 112_000,
    });
    await prisma.taxRate.update({ where: { code: "VAT12" }, data: { active: false } });
  });

  it("numbers without gaps: a refused issue does not use a number", async () => {
    const first = await issued("100");
    const empty = await actions.createInvoice({ source: "blank", clientName: "No lines" });
    const refused = await actions.issueInvoice(idOf(empty));
    expect(refused).toMatchObject({ ok: false });
    const next = await issued("100");
    const seq = (n: string) => Number(n.split("-")[2]);
    expect(seq(next.number)).toBe(seq(first.number) + 1);
  });

  it("is only for people who may issue", async () => {
    const id = await draft("50");
    current = SALES;
    try {
      expect(await actions.issueInvoice(id)).toMatchObject({ ok: false });
    } finally {
      current = OWNER;
    }
    expect((await repo.getInvoice(id, today()))?.status).toBe("draft");
  });
});

describe("payments", () => {
  it("settles an invoice, moving the money from receivables to the bank", async () => {
    const { id } = await issued("5,000");
    const ar = await roleCode("ar");
    const bank = await roleCode("bank");
    const [arBefore, bankBefore] = [await balance(ar), await balance(bank)];

    expect((await pay(id, "2,000")).ok).toBe(true);
    let invoice = await repo.getInvoice(id, today());
    expect(invoice).toMatchObject({ balanceMinor: 300_000, state: "partial" });
    expect(await balance(ar)).toBe(arBefore - 200_000);
    expect(await balance(bank)).toBe(bankBefore + 200_000);

    expect((await pay(id, "3,000")).ok).toBe(true);
    invoice = await repo.getInvoice(id, today());
    expect(invoice).toMatchObject({ balanceMinor: 0, state: "paid" });
  });

  it("records tax the client withheld as a receivable, so the invoice is still fully settled", async () => {
    const { id } = await issued("10,000");
    const cwtAccount = await roleCode("cwt_receivable");
    const cwtBefore = await balance(cwtAccount);
    // The client paid 9,500 and withheld 500: together they settle 10,000.
    expect((await pay(id, "9,500", { cwt: "500", allocate: "10,000" })).ok).toBe(true);
    expect(await balance(cwtAccount)).toBe(cwtBefore + 50_000);
    expect(await repo.getInvoice(id, today())).toMatchObject({ balanceMinor: 0, state: "paid" });
  });

  it("holds what is paid beyond an invoice as a customer deposit", async () => {
    const { id } = await issued("1,000");
    const deposits = await roleCode("customer_deposits");
    const before = await balance(deposits);
    expect((await pay(id, "1,500", { allocate: "1,000" })).ok).toBe(true);
    expect(await balance(deposits)).toBe(before - 50_000);
    const payment = (await repo.listPayments()).find((item) => item.invoiceNumbers.length === 1);
    expect(payment).toBeTruthy();
  });

  it("refuses to settle more than the invoice is owed", async () => {
    const { id } = await issued("1,000");
    const result = await pay(id, "2,000", { allocate: "1,500" });
    expect(result).toMatchObject({ ok: false });
    expect((await repo.getInvoice(id, today()))?.balanceMinor).toBe(100_000);
  });

  it("refuses, in the database, a payment that settles more than it brought in", async () => {
    const { id } = await issued("1,000");
    const created = await pay(id, "400", { allocate: "400" });
    expect(created.ok).toBe(true);
    const payment = await prisma.payment.findFirstOrThrow({
      where: { allocations: { some: { invoiceId: id } } },
    });
    await expect(
      prisma.paymentAllocation.create({
        data: { paymentId: payment.id, invoiceId: id, amountMinor: 10_000 },
      }),
    ).rejects.toThrow();
  });

  it("voiding a payment reverses it and the invoice owes the money again", async () => {
    const { id } = await issued("2,000");
    const bank = await roleCode("bank");
    const bankBefore = await balance(bank);
    await pay(id, "2,000");
    const payment = await prisma.payment.findFirstOrThrow({
      where: { allocations: { some: { invoiceId: id } } },
    });
    expect((await actions.voidPayment({ id: payment.id, reason: "Cheque bounced" })).ok).toBe(true);
    expect(await balance(bank)).toBe(bankBefore);
    expect(await repo.getInvoice(id, today())).toMatchObject({ balanceMinor: 200_000 });
    // A voided payment is not voided twice.
    expect(await actions.voidPayment({ id: payment.id, reason: "again" })).toMatchObject({
      ok: false,
    });
  });
});

describe("credit notes", () => {
  it("takes money off what is owed and posts against revenue", async () => {
    const { id } = await issued("3,000");
    const revenue = await roleCode("revenue_services");
    const before = await balance(revenue);
    const result = await actions.issueCreditNote({
      invoiceId: id,
      issueDate: today(),
      reason: "Agreed discount",
      subtotal: "500",
    });
    expect(result.ok).toBe(true);
    expect(await balance(revenue)).toBe(before + 50_000);
    expect(await repo.getInvoice(id, today())).toMatchObject({ balanceMinor: 250_000 });
  });

  it("can't credit more than is owed", async () => {
    const { id } = await issued("100");
    expect(
      await actions.issueCreditNote({
        invoiceId: id,
        issueDate: today(),
        reason: "Too much",
        subtotal: "500",
      }),
    ).toMatchObject({ ok: false });
  });
});

describe("voiding an invoice", () => {
  it("reverses its posting and keeps the record", async () => {
    const ar = await roleCode("ar");
    const revenue = await roleCode("revenue_services");
    const before = [await balance(ar), await balance(revenue)];
    const { id, number } = await issued("7,000");
    expect((await actions.voidInvoice({ id, reason: "Wrong client" })).ok).toBe(true);
    expect([await balance(ar), await balance(revenue)]).toEqual(before);
    expect(await repo.getInvoice(id, today())).toMatchObject({
      status: "void",
      number,
      voidReason: "Wrong client",
    });
  });

  it("is refused while a payment stands, and needs a reason", async () => {
    const { id } = await issued("1,000");
    expect(await actions.voidInvoice({ id, reason: "" })).toMatchObject({ ok: false });
    await pay(id, "100");
    expect(await actions.voidInvoice({ id, reason: "Mistake" })).toMatchObject({ ok: false });
  });
});

describe("drafts", () => {
  it("can be deleted, but an issued invoice cannot", async () => {
    const id = await draft("10");
    expect((await actions.deleteDraftInvoice(id)).ok).toBe(true);
    expect(await repo.getInvoice(id, today())).toBeNull();

    const { id: kept } = await issued("10");
    expect(await actions.deleteDraftInvoice(kept)).toMatchObject({ ok: false });
  });

  it("refuses a tax rate that is switched off", async () => {
    const created = await actions.createInvoice({ source: "blank", clientName: "Acme" });
    const result = await actions.saveInvoice({
      id: idOf(created),
      clientName: "Acme",
      issueDate: today(),
      dueDate: today(),
      taxCode: "VAT12",
      lines: [line("100", true)],
    });
    expect(result).toMatchObject({ ok: false });
  });
});

describe("receivables", () => {
  it("lists what is owed by client", async () => {
    const { id } = await issued("1,234.50", "Aging Client");
    const rows = await repo.receivablesAging(today());
    const row = rows.find((item) => item.clientName === "Aging Client");
    expect(row).toMatchObject({ invoices: 1, totalMinor: 123_450 });
    await pay(id, "1,234.50");
    const after = await repo.receivablesAging(today());
    expect(after.find((item) => item.clientName === "Aging Client")).toBeUndefined();
  });
});

describe("billing finished milestones", () => {
  async function milestones() {
    const project = await prisma.project.create({ data: { name: "Billing test project" } });
    const done = await prisma.milestone.create({
      data: {
        projectId: project.id,
        name: "Design",
        status: "done",
        billable: true,
        amountMinor: 250_000,
      },
    });
    const pending = await prisma.milestone.create({
      data: {
        projectId: project.id,
        name: "Launch",
        status: "pending",
        billable: true,
        amountMinor: 100_000,
      },
    });
    return { project, done, pending };
  }

  it("bills a finished milestone once, and voiding the invoice makes it billable again", async () => {
    const { done, pending } = await milestones();
    expect(
      await actions.createInvoice({ source: "milestones", milestoneIds: [pending.id] }),
    ).toMatchObject({ ok: false });

    const created = await actions.createInvoice({ source: "milestones", milestoneIds: [done.id] });
    expect(created.ok).toBe(true);
    const id = idOf(created);
    expect(await repo.getInvoice(id, today())).toMatchObject({
      totalMinor: 250_000,
      projectName: "Billing test project",
    });

    // The same milestone can't go on a second invoice.
    expect(
      await actions.createInvoice({ source: "milestones", milestoneIds: [done.id] }),
    ).toMatchObject({ ok: false });
    expect((await repo.listBillableMilestones()).some((item) => item.id === done.id)).toBe(false);

    // Editing the draft keeps the milestone attached to its line.
    const invoice = await repo.getInvoice(id, today());
    const saved = await actions.saveInvoice({
      id,
      clientName: invoice!.clientName,
      issueDate: today(),
      dueDate: today(),
      lines: [
        {
          description: "Design phase",
          quantity: "1",
          unitLabel: "milestone",
          price: "2,500",
          taxable: false,
        },
      ],
    });
    expect(saved.ok).toBe(true);
    expect(
      (await prisma.milestone.findUniqueOrThrow({ where: { id: done.id } })).invoiceLineId,
    ).toBeTruthy();

    expect((await actions.issueInvoice(id)).ok).toBe(true);
    expect((await actions.voidInvoice({ id, reason: "Billed too early" })).ok).toBe(true);
    expect((await repo.listBillableMilestones()).some((item) => item.id === done.id)).toBe(true);
  });
});
