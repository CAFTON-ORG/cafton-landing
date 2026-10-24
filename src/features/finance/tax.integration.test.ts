import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../../../scripts/pglite-setup.mjs";
import { SYSTEM_ROLE_PERMISSIONS, type Permission } from "@/lib/auth/permissions";

/**
 * The 8% income tax tracker against a real Postgres (PGlite) built from the real migrations: the
 * estimate follows the ledger, a filing posts to the books, the returns build on each other in
 * order, and the database keeps a recorded filing fixed.
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
let tax: typeof import("./actions/tax");
let repo: typeof import("./repository/tax");
let books: typeof import("./actions/books");

const today = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
/** A whole past year, so every return of it has come due and can be filed. */
const YEAR = Number(today().slice(0, 4)) - 1;
const accountId = async (code: string) =>
  (await prisma.account.findUniqueOrThrow({ where: { code } })).id;

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
  tax = await import("./actions/tax");
  repo = await import("./repository/tax");
  books = await import("./actions/books");

  // A year of receipts: 100,000 in Q1 (5,000 of it withheld by the client), 200,000 in Q2, 100,000
  // in Q3 and 100,000 in Q4: 300,000, 400,000 and 500,000 by the end of each.
  const earn = async (date: string, cash: string, withheld = "") => {
    const result = await books.postManualEntry({
      date,
      memo: "Client work",
      lines: [
        { accountId: await accountId("1010"), debit: cash, credit: "" },
        ...(withheld ? [{ accountId: await accountId("1200"), debit: withheld, credit: "" }] : []),
        { accountId: await accountId("4000"), debit: "", credit: withheld ? "100,000" : cash },
      ],
    });
    if (!result.ok) throw new Error(result.error);
  };
  await earn(`${YEAR}-03-10`, "95,000", "5,000");
  await earn(`${YEAR}-05-10`, "200,000");
  await earn(`${YEAR}-08-10`, "100,000");
  await earn(`${YEAR}-11-10`, "100,000");
}, 180_000);

afterAll(async () => {
  await server?.stop();
  await db?.close();
});

const file = async (
  kind: "q1" | "q2" | "q3" | "annual",
  extra: Record<string, string> = {},
  year = YEAR,
) => {
  const filedOn = {
    q1: `${year}-04-20`,
    q2: `${year}-07-20`,
    q3: `${year}-10-20`,
    annual: `${year + 1}-02-01`,
  }[kind];
  return tax.recordFiling({ year, kind, filedOn, reference: `REF-${kind}`, ...extra });
};

describe("the estimate follows the ledger", () => {
  it("is nothing under the allowance, then 8% of the receipts above it", async () => {
    const tracker = (await repo.getTracker(YEAR))!;
    const byKind = Object.fromEntries(tracker.obligations.map((o) => [o.obligation.kind, o]));
    expect(byKind.q1.grossMinor).toBe(10_000_000);
    expect(byKind.q1.estimate).toMatchObject({ taxToDateMinor: 0, cashDueMinor: 0 });
    // 300,000 by the end of June: 50,000 above the allowance, 4,000 tax, covered by 5,000 of withheld tax.
    expect(byKind.q2.estimate).toMatchObject({
      taxToDateMinor: 400_000,
      cwtToApplyMinor: 400_000,
      cashDueMinor: 0,
    });
    expect(byKind.q3.estimate?.taxToDateMinor).toBe(1_200_000);
    expect(byKind.annual.estimate?.taxToDateMinor).toBe(2_000_000);
    expect(tracker.grossToDateMinor).toBe(50_000_000);
    // Every return of a past year has come due.
    expect(tracker.obligations.every((o) => o.status === "overdue")).toBe(true);
  });
});

describe("filing the returns, in order", () => {
  it("records a nil return without posting anything", async () => {
    const entries = await prisma.journalEntry.count();
    const result = await file("q1");
    expect(result.ok).toBe(true);
    expect(await prisma.journalEntry.count()).toBe(entries);
    expect((await repo.getTracker(YEAR))!.obligations[0]).toMatchObject({ status: "filed" });
  });

  it("won't file a return before the one it builds on", async () => {
    const result = await file("q3", { cash: "1" }, YEAR);
    expect(result).toMatchObject({ ok: false });
    expect((result as { error: string }).error).toMatch(/earlier returns first/);
  });

  it("books the tax against the cash paid and the withheld tax used", async () => {
    const expense = await accountId("6900");
    const cwt = await accountId("1200");
    const before = await prisma.journalLine.aggregate({
      where: { accountId: cwt },
      _sum: { debitMinor: true, creditMinor: true },
    });
    // Second quarter: 4,000 of tax, all of it settled with withheld tax.
    // Filed well after the quarter ends (and after the next one does too), as real filings are: the
    // withheld tax it used must still count as used when the third quarter is worked out.
    expect((await file("q2", { cash: "", cwt: "4,000", filedOn: `${YEAR + 1}-01-10` })).ok).toBe(
      true,
    );
    const lines = await prisma.journalLine.findMany({ where: { entry: { sourceKind: "tax" } } });
    expect(
      lines.filter((l) => l.accountId === expense).reduce((s, l) => s + Number(l.debitMinor), 0),
    ).toBe(400_000);
    const after = await prisma.journalLine.aggregate({
      where: { accountId: cwt },
      _sum: { debitMinor: true, creditMinor: true },
    });
    expect(Number(after._sum.creditMinor) - Number(before._sum.creditMinor)).toBe(400_000);

    // Third quarter: 12,000 to date less the 4,000 settled is 8,000: 1,000 of withheld tax left, 7,000 in cash.
    const tracker = (await repo.getTracker(YEAR))!;
    const q3 = tracker.obligations[2];
    expect(q3.estimate).toMatchObject({
      remainingMinor: 800_000,
      cwtToApplyMinor: 100_000,
      cashDueMinor: 700_000,
    });
    const bank = await accountId("1010");
    expect((await file("q3", { cash: "7,000", cwt: "1,000", paidFromAccountId: bank })).ok).toBe(
      true,
    );
  });

  it("refuses withheld tax that isn't there, and cash without a source", async () => {
    const bank = await accountId("1010");
    expect(
      await file("annual", { cash: "8,000", cwt: "999,999", paidFromAccountId: bank }),
    ).toMatchObject({ ok: false });
    expect(await file("annual", { cash: "8,000" })).toMatchObject({ ok: false });
    expect((await file("annual", { cash: "8,000", paidFromAccountId: bank })).ok).toBe(true);
    // The year is now settled: 20,000 in all.
    const tracker = (await repo.getTracker(YEAR))!;
    expect(tracker.settledMinor).toBe(2_000_000);
    expect(tracker.obligations.every((o) => o.status === "filed")).toBe(true);
  });

  it("is already recorded once filed", async () => {
    expect(await file("q1")).toMatchObject({ ok: false });
  });

  it("is only for people who may post to the books", async () => {
    current = SALES;
    try {
      expect(await file("q1", {}, YEAR - 5)).toMatchObject({ ok: false });
    } finally {
      current = OWNER;
    }
  });

  it("won't take a filing for a period that hasn't ended", async () => {
    const year = Number(today().slice(0, 4));
    const result = await tax.recordFiling({ year, kind: "annual", filedOn: today() });
    expect(result).toMatchObject({ ok: false });
  });
});

describe("undoing one", () => {
  it("can't undo a return a later one builds on, but can undo the last and file it again", async () => {
    const q3 = await prisma.taxFiling.findFirstOrThrow({
      where: { taxYear: YEAR, kind: "q3", status: "filed" },
    });
    const annual = await prisma.taxFiling.findFirstOrThrow({
      where: { taxYear: YEAR, kind: "annual", status: "filed" },
    });
    expect(await tax.voidFiling({ id: q3.id, reason: "Wrong figures" })).toMatchObject({
      ok: false,
    });
    expect(await tax.voidFiling({ id: annual.id, reason: " " })).toMatchObject({ ok: false });

    const entries = await prisma.journalEntry.count();
    expect((await tax.voidFiling({ id: annual.id, reason: "Entered the wrong amount" })).ok).toBe(
      true,
    );
    expect(await prisma.journalEntry.count()).toBe(entries + 1); // its reversal
    expect((await repo.getTracker(YEAR))!.obligations[3].status).toBe("overdue");
    expect(
      (await file("annual", { cash: "8,000", paidFromAccountId: await accountId("1010") })).ok,
    ).toBe(true);
  });
});

describe("the database keeps a recorded filing fixed", () => {
  it("refuses to change or delete it, and a second live filing of the same return", async () => {
    const filing = await prisma.taxFiling.findFirstOrThrow({
      where: { taxYear: YEAR, kind: "q2", status: "filed" },
    });
    await expect(
      prisma.$executeRaw`UPDATE tax_filings SET cash_paid_minor = 1 WHERE id = ${filing.id}::uuid`,
    ).rejects.toThrow(/cannot be changed/i);
    await expect(
      prisma.$executeRaw`DELETE FROM tax_filings WHERE id = ${filing.id}::uuid`,
    ).rejects.toThrow(/cannot be deleted/i);
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO tax_filings (tax_year, kind, form, due_date, filed_on) VALUES (${YEAR}, 'q2', '1701Q', '${YEAR}-08-15', '${YEAR}-07-20')`,
      ),
    ).rejects.toThrow();
  });
});
