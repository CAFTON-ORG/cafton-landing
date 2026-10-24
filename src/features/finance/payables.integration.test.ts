import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../../../scripts/pglite-setup.mjs";
import { SYSTEM_ROLE_PERMISSIONS, type Permission } from "@/lib/auth/permissions";

/**
 * Suppliers, bills and payments out against a real Postgres (PGlite) built from the real
 * migrations: what approving, paying and voiding do to the books, and that the database itself
 * keeps an approved bill fixed and refuses a bill paid more than it is worth.
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
let actions: typeof import("./actions/payables");
let repo: typeof import("./repository/payables");
let books: typeof import("./repository/ledger");

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
  actions = await import("./actions/payables");
  repo = await import("./repository/payables");
  books = await import("./repository/ledger");
}, 120_000);

afterAll(async () => {
  await server?.stop();
  await db?.close();
});

const idOf = (result: unknown) => (result as { data: { id: string } }).data.id;
const today = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);

async function balance(code: string) {
  const row = (await books.trialBalance(today())).find((item) => item.code === code);
  return row ? row.debitMinor - row.creditMinor : 0;
}
const roleCode = async (key: string) =>
  (await prisma.account.findFirstOrThrow({ where: { systemKey: key } })).code;
const accountId = async (code: string) =>
  (await prisma.account.findUniqueOrThrow({ where: { code } })).id;

async function vendor(name = "Hosting Co") {
  const made = await actions.saveVendor({ name, termsDays: 30 });
  if (!made.ok) throw new Error(made.error);
  return made.data!.id;
}

/** A saved draft ready to approve: one line of software costs. */
async function draft(amount = "5,000", name = `Vendor ${Math.random().toString(36).slice(2, 8)}`) {
  const vendorId = await vendor(name);
  const created = await actions.createBill({ vendorId });
  if (!created.ok) throw new Error(created.error);
  const id = created.data!.id;
  const saved = await actions.saveBill({
    id,
    vendorId,
    vendorRef: "SI-1001",
    billDate: today(),
    dueDate: today(),
    lines: [{ description: "Annual hosting", accountId: await accountId("6300"), amount }],
  });
  if (!saved.ok) throw new Error(saved.error);
  return id;
}

async function approved(amount?: string) {
  const id = await draft(amount);
  const result = await actions.approveBill(id);
  if (!result.ok) throw new Error(result.error);
  return { id, number: result.data!.number };
}

async function pay(billId: string, amount: string, wht = "") {
  return actions.payBill({
    billId,
    paidDate: today(),
    amount,
    wht,
    method: "bank_transfer",
    paidFromAccountId: await accountId(await roleCode("bank")),
  });
}

describe("suppliers", () => {
  it("are unique by name, whatever the case, and can be archived", async () => {
    const id = await vendor("Unique Supplies");
    expect(await actions.saveVendor({ name: "unique supplies", termsDays: 15 })).toMatchObject({
      ok: false,
    });
    expect((await actions.setVendorActive({ id, active: false })).ok).toBe(true);
    const listed = (await repo.listVendors()).find((item) => item.id === id);
    expect(listed).toMatchObject({ active: false, billCount: 0 });
    expect(await actions.createBill({ vendorId: id })).toMatchObject({ ok: false });
  });
});

describe("approving a bill", () => {
  it("numbers it, posts it and fixes it", async () => {
    const ap = await roleCode("ap");
    const before = [await balance(ap), await balance("6300")];
    const { id, number } = await approved("5,000");
    expect(number).toMatch(/^BILL-\d{4}-\d{4}$/);
    expect(await balance(ap)).toBe(before[0] - 500_000);
    expect(await balance("6300")).toBe(before[1] + 500_000);

    expect(await repo.getBill(id, today())).toMatchObject({
      status: "approved",
      number,
      balanceMinor: 500_000,
      state: "open",
    });

    // The application refuses an edit with a reason...
    const vendorId = (await repo.getBill(id, today()))!.vendorId;
    expect(
      await actions.saveBill({
        id,
        vendorId,
        billDate: today(),
        dueDate: today(),
        lines: [{ description: "Changed", accountId: await accountId("6300"), amount: "1" }],
      }),
    ).toMatchObject({ ok: false });
    // ...and so does the database.
    await expect(
      prisma.$executeRaw`UPDATE bills SET total_minor = 1 WHERE id = ${id}::uuid`,
    ).rejects.toThrow(/approved bill/i);
    await expect(
      prisma.$executeRaw`DELETE FROM bill_lines WHERE bill_id = ${id}::uuid`,
    ).rejects.toThrow(/lines of an approved bill/i);
  });

  it("refuses an empty draft and leaves no gap in the numbers", async () => {
    const first = await approved("100");
    const vendorId = await vendor(`Empty ${Math.random().toString(36).slice(2, 8)}`);
    const empty = await actions.createBill({ vendorId });
    expect(await actions.approveBill(idOf(empty))).toMatchObject({ ok: false });
    const next = await approved("100");
    const seq = (n: string) => Number(n.split("-")[2]);
    expect(seq(next.number)).toBe(seq(first.number) + 1);
  });

  it("is only for people who may approve", async () => {
    const id = await draft("50");
    current = SALES;
    try {
      expect(await actions.approveBill(id)).toMatchObject({ ok: false });
    } finally {
      current = OWNER;
    }
    expect((await repo.getBill(id, today()))?.status).toBe("draft");
  });

  it("will not book a cost to a revenue account", async () => {
    const vendorId = await vendor(`Odd ${Math.random().toString(36).slice(2, 8)}`);
    const created = await actions.createBill({ vendorId });
    expect(
      await actions.saveBill({
        id: idOf(created),
        vendorId,
        billDate: today(),
        dueDate: today(),
        lines: [{ description: "Oops", accountId: await accountId("4000"), amount: "10" }],
      }),
    ).toMatchObject({ ok: false });
  });
});

describe("paying a bill", () => {
  it("moves the money from payables to the bank", async () => {
    const { id } = await approved("2,000");
    const ap = await roleCode("ap");
    const bank = await roleCode("bank");
    const [apBefore, bankBefore] = [await balance(ap), await balance(bank)];
    expect((await pay(id, "800")).ok).toBe(true);
    expect(await repo.getBill(id, today())).toMatchObject({
      balanceMinor: 120_000,
      state: "partial",
    });
    expect(await balance(ap)).toBe(apBefore + 80_000);
    expect(await balance(bank)).toBe(bankBefore - 80_000);
    expect((await pay(id, "1,200")).ok).toBe(true);
    expect(await repo.getBill(id, today())).toMatchObject({ balanceMinor: 0, state: "paid" });
  });

  it("sets aside tax held back from the supplier", async () => {
    const { id } = await approved("10,000");
    const withholding = await roleCode("withholding_payable");
    const bank = await roleCode("bank");
    const [whBefore, bankBefore] = [await balance(withholding), await balance(bank)];
    // 9,800 reaches the supplier, 200 (2%) is held back for the BIR: together they settle 10,000.
    expect((await pay(id, "9,800", "200")).ok).toBe(true);
    expect(await balance(withholding)).toBe(whBefore - 20_000);
    expect(await balance(bank)).toBe(bankBefore - 980_000);
    expect(await repo.getBill(id, today())).toMatchObject({ balanceMinor: 0, state: "paid" });
  });

  it("refuses to pay more than is owed, in the app and in the database", async () => {
    const { id } = await approved("1,000");
    expect(await pay(id, "1,500")).toMatchObject({ ok: false });
    expect((await pay(id, "400")).ok).toBe(true);
    const payment = await prisma.billPayment.findFirstOrThrow({ where: { billId: id } });
    await expect(
      prisma.billPayment.create({
        data: {
          number: "BPAY-TEST-1",
          billId: id,
          paidDate: new Date(`${today()}T00:00:00Z`),
          amountMinor: 999_999,
          paidFromAccountId: payment.paidFromAccountId,
          journalEntryId: payment.journalEntryId,
        },
      }),
    ).rejects.toThrow();
  });

  it("will not pay a draft", async () => {
    const id = await draft("100");
    expect(await pay(id, "100")).toMatchObject({ ok: false });
  });

  it("voiding a payment reverses it and the bill is owed again", async () => {
    const { id } = await approved("700");
    const bank = await roleCode("bank");
    const before = await balance(bank);
    await pay(id, "700");
    const payment = await prisma.billPayment.findFirstOrThrow({ where: { billId: id } });
    expect((await actions.voidBillPayment({ id: payment.id, reason: "Wrong account" })).ok).toBe(
      true,
    );
    expect(await balance(bank)).toBe(before);
    expect(await repo.getBill(id, today())).toMatchObject({ balanceMinor: 70_000 });
    expect(await actions.voidBillPayment({ id: payment.id, reason: "again" })).toMatchObject({
      ok: false,
    });
  });
});

describe("voiding a bill", () => {
  it("reverses its posting and keeps the record", async () => {
    const ap = await roleCode("ap");
    const before = [await balance(ap), await balance("6300")];
    const { id, number } = await approved("3,000");
    expect((await actions.voidBill({ id, reason: "Duplicate" })).ok).toBe(true);
    expect([await balance(ap), await balance("6300")]).toEqual(before);
    expect(await repo.getBill(id, today())).toMatchObject({ status: "void", number });
  });

  it("is refused while a payment stands, and needs a reason", async () => {
    const { id } = await approved("1,000");
    expect(await actions.voidBill({ id, reason: "" })).toMatchObject({ ok: false });
    await pay(id, "100");
    expect(await actions.voidBill({ id, reason: "Mistake" })).toMatchObject({ ok: false });
  });
});

describe("drafts and aging", () => {
  it("a draft can be deleted but an approved bill cannot", async () => {
    const id = await draft("10");
    expect((await actions.deleteDraftBill(id)).ok).toBe(true);
    expect(await repo.getBill(id, today())).toBeNull();
    const { id: kept } = await approved("10");
    expect(await actions.deleteDraftBill(kept)).toMatchObject({ ok: false });
  });

  it("lists what is owed by supplier", async () => {
    const name = "Aging Supplier";
    const vendorId = await vendor(name);
    const created = await actions.createBill({ vendorId });
    await actions.saveBill({
      id: idOf(created),
      vendorId,
      billDate: today(),
      dueDate: today(),
      lines: [{ description: "Work", accountId: await accountId("6500"), amount: "1,234.50" }],
    });
    await actions.approveBill(idOf(created));
    const row = (await repo.payablesAging(today())).find((item) => item.vendorName === name);
    expect(row).toMatchObject({ bills: 1, totalMinor: 123_450 });
    await pay(idOf(created), "1,234.50");
    expect(
      (await repo.payablesAging(today())).find((item) => item.vendorName === name),
    ).toBeUndefined();
  });
});
