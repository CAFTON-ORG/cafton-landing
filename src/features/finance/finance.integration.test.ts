import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../../../scripts/pglite-setup.mjs";
import { SYSTEM_ROLE_PERMISSIONS, type Permission } from "@/lib/auth/permissions";

/**
 * The ledger against a real Postgres (PGlite) built from the real migrations: that the database
 * itself refuses an unbalanced entry, a change to anything posted, and a posting into a closed
 * month, whatever the application does, and that the application's own rules say it kindly first.
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
let books: typeof import("./actions/books");
let repo: typeof import("./repository");
let ledger: typeof import("./ledger");

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
  books = await import("./actions/books");
  repo = await import("./repository");
  ledger = await import("./ledger");
}, 120_000);

afterAll(async () => {
  await server?.stop();
  await db?.close();
});

const today = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const account = async (code: string) =>
  (await prisma.account.findUniqueOrThrow({ where: { code } })).id;

/** Cash in the bank and capital from the owner: the simplest balanced entry. */
async function capitalEntry(amount = "10,000", date = today(), memo = "Owner put in cash") {
  const bank = await account("1010");
  const capital = await account("3000");
  return books.postManualEntry({
    date,
    memo,
    lines: [
      { accountId: bank, debit: amount, credit: "" },
      { accountId: capital, debit: "", credit: amount },
    ],
  });
}

describe("the starting books", () => {
  it("ships a chart of accounts with the roles Finance posts to, and no VAT by default", async () => {
    const accounts = await repo.listAccounts();
    const roles = accounts.filter((a) => a.systemKey).map((a) => a.systemKey);
    for (const role of [
      "cash",
      "bank",
      "ar",
      "ap",
      "revenue_services",
      "retained_earnings",
      "income_tax_expense",
      "income_tax_payable",
      "cwt_receivable",
    ]) {
      expect(roles).toContain(role);
    }
    expect(accounts.find((a) => a.code === "1100")).toMatchObject({
      type: "asset",
      name: "Accounts receivable",
    });
    expect(accounts.find((a) => a.code === "4000")).toMatchObject({ type: "revenue" });
    const rates = await repo.listTaxRates();
    expect(rates.find((r) => r.code === "NOVAT")).toMatchObject({ rateBp: 0, active: true });
    expect(rates.find((r) => r.code === "VAT12")).toMatchObject({ rateBp: 1200, active: false });
  });
});

describe("posting entries", () => {
  it("posts a balanced entry, numbers it and records who did it", async () => {
    const made = await capitalEntry();
    expect(made.ok, JSON.stringify(made)).toBe(true);
    const entry = await repo.getJournalEntry((made as { data: { id: string } }).data.id);
    expect(entry?.number).toMatch(/^JE-\d{4}-\d{4}$/);
    expect(entry).toMatchObject({
      memo: "Owner put in cash",
      sourceKind: "manual",
      totalMinor: 1_000_000,
    });
    expect(entry?.lines.map((l) => [l.accountCode, l.debitMinor, l.creditMinor])).toEqual([
      ["1010", 1_000_000, 0],
      ["3000", 0, 1_000_000],
    ]);
    expect(
      await prisma.auditLog.count({ where: { action: "journal.post", entityId: entry!.id } }),
    ).toBe(1);
    const bank = (await repo.listAccounts()).find((a) => a.code === "1010")!;
    expect(bank).toMatchObject({ balanceMinor: 1_000_000, used: true });
  });

  it("explains an unbalanced or incomplete entry instead of posting it", async () => {
    const bank = await account("1010");
    const capital = await account("3000");
    const unbalanced = await books.postManualEntry({
      date: today(),
      memo: "Typo",
      lines: [
        { accountId: bank, debit: "100", credit: "" },
        { accountId: capital, debit: "", credit: "99.99" },
      ],
    });
    expect(unbalanced).toMatchObject({
      ok: false,
      fieldErrors: { form: expect.stringMatching(/₱0\.01/) },
    });
    expect(
      await books.postManualEntry({
        date: today(),
        memo: "One line",
        lines: [{ accountId: bank, debit: "5", credit: "" }],
      }),
    ).toMatchObject({ ok: false });
    expect(
      await books.postManualEntry({
        date: today(),
        memo: " ",
        lines: [
          { accountId: bank, debit: "5", credit: "" },
          { accountId: capital, debit: "", credit: "5" },
        ],
      }),
    ).toMatchObject({ ok: false, fieldErrors: { memo: expect.any(String) } });
    expect(
      await books.postManualEntry({
        date: "2099-01-01",
        memo: "Far ahead",
        lines: [
          { accountId: bank, debit: "5", credit: "" },
          { accountId: capital, debit: "", credit: "5" },
        ],
      }),
    ).toMatchObject({ ok: false, fieldErrors: { date: expect.any(String) } });
    expect(
      await books.postManualEntry({
        date: today(),
        memo: "Bad amount",
        lines: [
          { accountId: bank, debit: "lots", credit: "" },
          { accountId: capital, debit: "", credit: "5" },
        ],
      }),
    ).toMatchObject({ ok: false });
  });

  it("is for people who keep the books", async () => {
    current = SALES;
    const refused = await capitalEntry();
    current = OWNER;
    expect(refused.ok).toBe(false);
  });

  it("keeps the trial balance in step: debits always equal credits", async () => {
    const bank = await account("1010");
    const rent = await account("6100");
    const revenue = await account("4000");
    await books.postManualEntry({
      date: today(),
      memo: "Rent",
      lines: [
        { accountId: rent, debit: "1,234.57", credit: "" },
        { accountId: bank, debit: "", credit: "1,234.57" },
      ],
    });
    await books.postManualEntry({
      date: today(),
      memo: "Cash sale",
      lines: [
        { accountId: bank, debit: "5,000.05", credit: "" },
        { accountId: revenue, debit: "", credit: "5,000.05" },
      ],
    });
    const rows = await repo.trialBalance(today());
    const debit = rows.reduce((sum, row) => sum + row.debitMinor, 0);
    const credit = rows.reduce((sum, row) => sum + row.creditMinor, 0);
    expect(debit).toBe(credit);
    expect(debit).toBeGreaterThan(0);
  });
});

describe("what the database refuses by itself", () => {
  const bad = async (run: () => Promise<unknown>) => {
    await expect(run()).rejects.toThrow();
  };
  const newEntry = (memo: string) => ({
    entryDate: day(today()),
    memo,
    createdByName: "Test",
  });

  it("an entry that doesn't balance", async () => {
    const bank = await account("1010");
    const capital = await account("3000");
    await bad(() =>
      prisma.$transaction(async (tx) => {
        await tx.journalEntry.create({
          data: {
            ...newEntry("Unbalanced"),
            lines: {
              create: [
                { accountId: bank, debitMinor: 100 },
                { accountId: capital, creditMinor: 99 },
              ],
            },
          },
        });
      }),
    );
  });

  it("an entry with one line, or with none", async () => {
    const bank = await account("1010");
    await bad(() =>
      prisma.$transaction(async (tx) => {
        await tx.journalEntry.create({
          data: {
            ...newEntry("One line"),
            lines: { create: [{ accountId: bank, debitMinor: 100 }] },
          },
        });
      }),
    );
    await bad(() =>
      prisma.$transaction(
        async (tx) => void (await tx.journalEntry.create({ data: newEntry("No lines") })),
      ),
    );
  });

  it("a line that is both a debit and a credit, or neither", async () => {
    const bank = await account("1010");
    const capital = await account("3000");
    for (const odd of [
      { debitMinor: 5, creditMinor: 5 },
      { debitMinor: 0, creditMinor: 0 },
    ]) {
      await bad(() =>
        prisma.$transaction(async (tx) => {
          await tx.journalEntry.create({
            data: {
              ...newEntry("Odd line"),
              lines: {
                create: [
                  { accountId: bank, ...odd },
                  { accountId: capital, creditMinor: 5 },
                ],
              },
            },
          });
        }),
      );
    }
  });

  it("changing or deleting anything posted", async () => {
    const entry = await prisma.journalEntry.findFirstOrThrow({ include: { lines: true } });
    await expect(
      prisma.journalEntry.update({ where: { id: entry.id }, data: { memo: "Edited" } }),
    ).rejects.toThrow(/cannot be changed or deleted/);
    await expect(prisma.journalEntry.delete({ where: { id: entry.id } })).rejects.toThrow(
      /cannot be changed or deleted/,
    );
    await expect(
      prisma.journalLine.update({ where: { id: entry.lines[0].id }, data: { debitMinor: 1 } }),
    ).rejects.toThrow(/cannot be changed or deleted/);
    await expect(prisma.journalLine.deleteMany({ where: { entryId: entry.id } })).rejects.toThrow(
      /cannot be changed or deleted/,
    );
  });
});

describe("accounts", () => {
  it("adds accounts with a unique code that fits their type", async () => {
    const made = await books.saveAccount({
      code: "6700",
      name: "Travel",
      type: "expense",
      description: "",
    });
    expect(made.ok).toBe(true);
    expect(await books.saveAccount({ code: "6700", name: "Again", type: "expense" })).toMatchObject(
      { ok: false, fieldErrors: { code: expect.any(String) } },
    );
    expect(
      await books.saveAccount({ code: "1700", name: "Mislabelled", type: "expense" }),
    ).toMatchObject({ ok: false, fieldErrors: { code: expect.any(String) } });
    expect(await books.saveAccount({ code: "67", name: "Short", type: "expense" })).toMatchObject({
      ok: false,
    });
    current = SALES;
    expect(
      await books.saveAccount({ code: "6800", name: "Not allowed", type: "expense" }),
    ).toMatchObject({ ok: false });
    current = OWNER;
  });

  it("locks the type once it has postings, and keeps the system's accounts", async () => {
    const travel = await prisma.account.findUniqueOrThrow({ where: { code: "6700" } });
    const bank = await account("1010");
    await books.postManualEntry({
      date: today(),
      memo: "Flight",
      lines: [
        { accountId: travel.id, debit: "900", credit: "" },
        { accountId: bank, debit: "", credit: "900" },
      ],
    });
    expect(
      await books.saveAccount({ id: travel.id, code: "6700", name: "Travel", type: "asset" }),
    ).toMatchObject({ ok: false });
    expect(
      (
        await books.saveAccount({
          id: travel.id,
          code: "6700",
          name: "Travel and transport",
          type: "expense",
        })
      ).ok,
    ).toBe(true);
    // The database says the same if asked directly.
    await expect(
      prisma.account.update({ where: { id: travel.id }, data: { type: "asset" } }),
    ).rejects.toThrow(/keeps its type/);
    // A system account can't be archived.
    const ar = await account("1100");
    expect(await books.setAccountActive(ar, false)).toMatchObject({ ok: false });
  });

  it("takes no postings once archived, and can be restored", async () => {
    const misc = await prisma.account.findUniqueOrThrow({ where: { code: "6990" } });
    const bank = await account("1010");
    expect((await books.setAccountActive(misc.id, false)).ok).toBe(true);
    const refused = await books.postManualEntry({
      date: today(),
      memo: "To archived",
      lines: [
        { accountId: misc.id, debit: "10", credit: "" },
        { accountId: bank, debit: "", credit: "10" },
      ],
    });
    expect(refused).toMatchObject({ ok: false });
    // ...and the database refuses it even when the application is bypassed.
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.journalEntry.create({
          data: {
            entryDate: day(today()),
            memo: "Bypass",
            createdByName: "Test",
            lines: {
              create: [
                { accountId: misc.id, debitMinor: 10 },
                { accountId: bank, creditMinor: 10 },
              ],
            },
          },
        });
      }),
    ).rejects.toThrow(/archived/);
    expect((await books.setAccountActive(misc.id, true)).ok).toBe(true);
  });
});

describe("closing the books", () => {
  const month = (n: number) => String(n).padStart(2, "0");
  const lastYear = new Date().getUTCFullYear() - 1;

  it("closes months in order and refuses postings into a closed month, in the app and in the database", async () => {
    // Work in a past year so nothing here collides with today's entries.
    const bank = await account("1010");
    const capital = await account("3000");
    for (const m of [1, 2]) {
      expect((await capitalEntry("100", `${lastYear}-${month(m)}-15`, `Opening ${m}`)).ok).toBe(
        true,
      );
    }
    expect(await books.closePeriod({ year: lastYear, month: 2 })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Close January first/),
    });
    expect((await books.closePeriod({ year: lastYear, month: 1 })).ok).toBe(true);
    expect((await books.closePeriod({ year: lastYear, month: 2 })).ok).toBe(true);

    const refused = await capitalEntry("50", `${lastYear}-02-20`, "Late entry");
    expect(refused).toMatchObject({ ok: false, error: expect.stringMatching(/closed/) });
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.journalEntry.create({
          data: {
            entryDate: day(`${lastYear}-01-20`),
            memo: "Bypass",
            createdByName: "Test",
            lines: {
              create: [
                { accountId: bank, debitMinor: 5000 },
                { accountId: capital, creditMinor: 5000 },
              ],
            },
          },
        });
      }),
    ).rejects.toThrow(/closed/);

    // Open months are unaffected, and only the latest closed month reopens.
    expect((await capitalEntry("25", `${lastYear}-03-10`, "March is open")).ok).toBe(true);
    expect(await books.reopenPeriod({ year: lastYear, month: 1 })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Reopen February first/),
    });
    expect((await books.reopenPeriod({ year: lastYear, month: 2 })).ok).toBe(true);
    expect((await capitalEntry("50", `${lastYear}-02-20`, "Now allowed")).ok).toBe(true);

    const periods = await repo.listPeriods(lastYear);
    expect(periods).toHaveLength(12);
    expect(periods.slice(0, 3).map((p) => [p.month, p.status, p.entries > 0])).toEqual([
      [1, "closed", true],
      [2, "open", true],
      [3, "open", true],
    ]);
    expect(periods[0].closedByName).toBeTruthy();
    expect(
      await prisma.auditLog.count({ where: { action: { in: ["period.close", "period.reopen"] } } }),
    ).toBe(3);

    current = SALES;
    expect(await books.closePeriod({ year: lastYear, month: 2 })).toMatchObject({ ok: false });
    current = OWNER;
  });
});

describe("reversing", () => {
  it("undoes an entry with a mirrored one, once, and leaves both in the books", async () => {
    const made = await capitalEntry("777", today(), "Posted by mistake");
    const id = (made as { data: { id: string } }).data.id;
    expect(await books.reverseEntry({ id, reason: " " })).toMatchObject({ ok: false });

    const before = (await repo.listAccounts()).find((a) => a.code === "1010")!.balanceMinor;
    const undone = await books.reverseEntry({ id, reason: "Posted by mistake" });
    expect(undone.ok, JSON.stringify(undone)).toBe(true);
    const reversalId = (undone as { data: { id: string } }).data.id;

    const original = await repo.getJournalEntry(id);
    const reversal = await repo.getJournalEntry(reversalId);
    expect(original?.reversedByNumber).toBe(reversal?.number);
    expect(reversal).toMatchObject({
      sourceKind: "reversal",
      reversesNumber: original?.number,
      totalMinor: original?.totalMinor,
    });
    expect(reversal?.lines.map((l) => [l.accountCode, l.debitMinor, l.creditMinor])).toEqual([
      ["1010", 0, 77_700],
      ["3000", 77_700, 0],
    ]);
    // The accounts are back where they were, the original is untouched.
    expect((await repo.listAccounts()).find((a) => a.code === "1010")!.balanceMinor).toBe(
      before - 77_700,
    );
    expect(original?.lines).toHaveLength(2);

    // Neither can be reversed again.
    expect(await books.reverseEntry({ id, reason: "Again" })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/already reversed/),
    });
    expect(await books.reverseEntry({ id: reversalId, reason: "Undo the undo" })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/already undoes/),
    });
    // The database holds the same line: an entry is undone once.
    const bank = await account("1010");
    const capital = await account("3000");
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.journalEntry.create({
          data: {
            entryDate: day(today()),
            memo: "Second reversal",
            sourceKind: "reversal",
            reversesId: id,
            createdByName: "Test",
            lines: {
              create: [
                { accountId: capital, debitMinor: 77_700 },
                { accountId: bank, creditMinor: 77_700 },
              ],
            },
          },
        });
      }),
    ).rejects.toThrow();
  });
});
