import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../../../scripts/pglite-setup.mjs";
import { addDays } from "@/features/schedule/slots";
import { SYSTEM_ROLE_PERMISSIONS, type Permission } from "@/lib/auth/permissions";

/**
 * Recurring bills and expenses against a real Postgres (PGlite) built from the real migrations:
 * that a run makes drafts (never postings), that each date is made once however often the job
 * runs, and that pausing, ending and an archived supplier are respected.
 */

const OWNER = {
  id: "55555555-5555-4555-8555-555555555555",
  name: "owner 5555",
  email: "owner-5555@cafton.com",
  roleKey: "owner",
  roleName: "owner",
  permissions: SYSTEM_ROLE_PERMISSIONS.owner,
};

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/auth/dal", () => ({
  requirePermission: vi.fn(async (permission: Permission) => {
    if (!OWNER.permissions.includes(permission)) {
      const { ForbiddenError } = await import("@/lib/actions");
      throw new ForbiddenError();
    }
    return OWNER;
  }),
  verifySession: vi.fn(async () => OWNER),
  can: (staff: { permissions: readonly string[] }, permission: Permission) =>
    staff.permissions.includes(permission),
}));

let db: PGlite;
let server: PGLiteSocketServer;
let prisma: typeof import("@/lib/db").prisma;
let actions: typeof import("./actions/recurring");
let payables: typeof import("./actions/payables");
let server_: typeof import("./recurring-server");

beforeAll(async () => {
  db = (await createDatabase()) as PGlite;
  server = new PGLiteSocketServer({ db, port: 0, host: "127.0.0.1", maxConnections: 4 });
  await server.start();
  const port = (server as unknown as { server: { address(): { port: number } } }).server.address()
    .port;
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_POOL_MAX = "1";
  await db
    .exec(`INSERT INTO auth.users (id, email) VALUES ('${OWNER.id}', '${OWNER.email}')`)
    .catch(() => undefined);
  await db.exec(
    `INSERT INTO profiles (id, email, full_name, role_id)
     SELECT '${OWNER.id}', '${OWNER.email}', '${OWNER.name}', id FROM roles WHERE key = 'owner' ON CONFLICT DO NOTHING`,
  );
  ({ prisma } = await import("@/lib/db"));
  actions = await import("./actions/recurring");
  payables = await import("./actions/payables");
  server_ = await import("./recurring-server");
}, 120_000);

afterAll(async () => {
  await server?.stop();
  await db?.close();
});

const today = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
const idOf = (result: unknown) => (result as { data: { id: string } }).data.id;
const accountId = async (code: string) =>
  (await prisma.account.findUniqueOrThrow({ where: { code } })).id;

async function vendor(name: string) {
  const made = await payables.saveVendor({ name, termsDays: 10 });
  return idOf(made);
}

async function recurringBill(name: string, startDate: string, extra: Record<string, unknown> = {}) {
  const result = await actions.saveRecurring({
    kind: "bill",
    name,
    frequency: "monthly",
    startDate,
    vendorId: await vendor(`${name} supplier`),
    description: "Monthly rent",
    accountId: await accountId("6100"),
    amount: "15,000",
    ...extra,
  });
  if (!result.ok) throw new Error(result.error);
  return idOf(result);
}

describe("making what is due", () => {
  it("makes a DRAFT bill, posts nothing, and moves the next date on", async () => {
    const entriesBefore = await prisma.journalEntry.count();
    const id = await recurringBill("Rent A", today());
    const run = await server_.generateDueRecurring();
    expect(run.bills).toBeGreaterThanOrEqual(1);

    const bills = await prisma.bill.findMany({
      where: { recurringId: id },
      include: { lines: true },
    });
    expect(bills).toHaveLength(1);
    expect(bills[0]).toMatchObject({ status: "draft", number: null });
    expect(Number(bills[0].totalMinor)).toBe(1_500_000);
    expect(bills[0].lines).toHaveLength(1);
    expect(await prisma.journalEntry.count()).toBe(entriesBefore);

    const item = await prisma.recurringItem.findUniqueOrThrow({ where: { id } });
    expect(item.nextDate.toISOString().slice(0, 10) > today()).toBe(true);
    expect(item.createdCount).toBe(1);
  });

  it("makes each date once, however often the job runs", async () => {
    const id = await recurringBill("Rent B", addDays(today(), -70));
    await server_.generateDueRecurring();
    const first = await prisma.bill.count({ where: { recurringId: id } });
    expect(first).toBeGreaterThanOrEqual(3); // caught up on the missed months
    await server_.generateDueRecurring();
    await server_.generateDueRecurring();
    expect(await prisma.bill.count({ where: { recurringId: id } })).toBe(first);
  });

  it("refuses, in the database, a second bill for the same date", async () => {
    const id = await recurringBill("Rent C", today());
    await server_.generateDueRecurring();
    const made = await prisma.bill.findFirstOrThrow({ where: { recurringId: id } });
    await expect(
      prisma.bill.create({
        data: {
          vendorId: made.vendorId,
          vendorName: made.vendorName,
          billDate: made.billDate,
          dueDate: made.dueDate,
          recurringId: id,
          recursOn: made.recursOn,
        },
      }),
    ).rejects.toThrow();
  });

  it("makes an expense waiting for approval from a recurring expense", async () => {
    const result = await actions.saveRecurring({
      kind: "expense",
      name: "Domain renewal",
      frequency: "yearly",
      startDate: today(),
      payee: "Namecheap",
      description: "Domain",
      accountId: await accountId("6300"),
      amount: "900",
      paidFromAccountId: await accountId("1010"),
    });
    const id = idOf(result);
    await server_.generateDueRecurring();
    const expenses = await prisma.expense.findMany({ where: { recurringId: id } });
    expect(expenses).toHaveLength(1);
    expect(expenses[0]).toMatchObject({
      status: "submitted",
      payee: "Namecheap",
      submittedBy: null,
    });
    expect(expenses[0].submittedByName).toMatch(/Domain renewal/);
  });

  it("makes nothing for a paused item, and carries on when it is resumed", async () => {
    const id = await recurringBill("Rent D", today());
    await actions.setRecurringActive({ id, active: false });
    await server_.generateDueRecurring();
    expect(await prisma.bill.count({ where: { recurringId: id } })).toBe(0);
    await actions.setRecurringActive({ id, active: true });
    await server_.generateDueRecurring();
    expect(await prisma.bill.count({ where: { recurringId: id } })).toBe(1);
  });

  it("stops at its end date and switches itself off", async () => {
    const id = await recurringBill("Rent E", addDays(today(), -40), {
      endDate: addDays(today(), -5),
    });
    await server_.generateDueRecurring();
    const item = await prisma.recurringItem.findUniqueOrThrow({ where: { id } });
    expect(item.active).toBe(false);
    expect(await prisma.bill.count({ where: { recurringId: id } })).toBeGreaterThanOrEqual(1);
    const made = await prisma.bill.count({ where: { recurringId: id } });
    await server_.generateDueRecurring();
    expect(await prisma.bill.count({ where: { recurringId: id } })).toBe(made);
  });

  it("leaves an item alone when its supplier has been archived", async () => {
    const id = await recurringBill("Rent F", today());
    const item = await prisma.recurringItem.findUniqueOrThrow({ where: { id } });
    await payables.setVendorActive({ id: item.vendorId as string, active: false });
    const run = await server_.generateDueRecurring();
    expect(run.skipped).toBeGreaterThanOrEqual(1);
    expect(await prisma.bill.count({ where: { recurringId: id } })).toBe(0);
  });

  it("keeps what it made when the recurring item is deleted", async () => {
    const id = await recurringBill("Rent G", today());
    await server_.generateDueRecurring();
    expect((await actions.deleteRecurring(id)).ok).toBe(true);
    const kept = await prisma.bill.findMany({ where: { vendorName: "Rent G supplier" } });
    expect(kept).toHaveLength(1);
    expect(kept[0].recurringId).toBeNull();
  });

  it("an approved bill made by it posts like any other", async () => {
    const id = await recurringBill("Rent H", today());
    await server_.generateDueRecurring();
    const made = await prisma.bill.findFirstOrThrow({ where: { recurringId: id } });
    const approved = await payables.approveBill(made.id);
    expect(approved.ok).toBe(true);
  });
});

describe("saving one", () => {
  it("refuses a bill without a supplier and a revenue account", async () => {
    expect(
      await actions.saveRecurring({
        kind: "bill",
        name: "No supplier",
        frequency: "monthly",
        startDate: today(),
        description: "x",
        accountId: await accountId("6100"),
        amount: "1",
      }),
    ).toMatchObject({ ok: false });
    expect(
      await actions.saveRecurring({
        kind: "bill",
        name: "Odd",
        frequency: "monthly",
        startDate: today(),
        vendorId: await vendor("Odd supplier"),
        description: "x",
        accountId: await accountId("4000"),
        amount: "1",
      }),
    ).toMatchObject({ ok: false });
  });
});
