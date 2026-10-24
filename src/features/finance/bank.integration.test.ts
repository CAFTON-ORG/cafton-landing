import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../../../scripts/pglite-setup.mjs";
import { addDays } from "@/features/schedule/rules/slots";
import { SYSTEM_ROLE_PERMISSIONS, type Permission } from "@/lib/auth/permissions";

/**
 * Bank accounts, statement import and reconciliation against a real Postgres (PGlite) built from the
 * real migrations: importing without doubling lines, matching and booking, and that the database
 * itself refuses a mismatched match, a rewritten statement line and a change inside a signed-off
 * period.
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
let bank: typeof import("./actions/bank");
let books: typeof import("./actions/books");
let repo: typeof import("./repository/bank");

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
  bank = await import("./actions/bank");
  books = await import("./actions/books");
  repo = await import("./repository/bank");
}, 120_000);

afterAll(async () => {
  await server?.stop();
  await db?.close();
});

const today = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
const idOf = (result: unknown) => (result as { data: { id: string } }).data.id;
const accountId = async (code: string) =>
  (await prisma.account.findUniqueOrThrow({ where: { code } })).id;
const params = (status = "") =>
  ({ q: "", page: 1, pageSize: 100, sort: "date", dir: "asc", filters: { status } }) as never;

let bankId = "";
const d1 = addDays(today(), -20);
const d2 = addDays(today(), -19);
const d3 = addDays(today(), -18);

/** ₱10,000 in from the owner, in the books on d1. */
async function capital(amount = "10,000", on = d1) {
  const result = await books.postManualEntry({
    date: on,
    memo: "Owner put in cash",
    lines: [
      { accountId: await accountId("1010"), debit: amount, credit: "" },
      { accountId: await accountId("3000"), debit: "", credit: amount },
    ],
  });
  if (!result.ok) throw new Error(result.error);
}

const csv = (rows: string[]) => `Date,Description,Amount,Balance\n${rows.join("\n")}\n`;
const statement = csv([
  `${d1},Deposit from owner,10000.00,10000.00`,
  `${d2},ATM fee,-25.00,9975.00`,
  `${d3},Mystery credit,300.00,10275.00`,
]);

async function importStatement(text = statement, dryRun = false) {
  return bank.importStatement({
    bankAccountId: bankId,
    fileName: "oct.csv",
    csv: text,
    dateFormat: "ymd",
    dryRun,
  });
}

describe("bank accounts", () => {
  it("link to an asset account, once each", async () => {
    const made = await bank.saveBankAccount({
      name: "BPI Checking",
      accountId: await accountId("1010"),
      numberHint: "4821",
    });
    expect(made.ok).toBe(true);
    bankId = idOf(made);
    expect(
      await bank.saveBankAccount({ name: "Again", accountId: await accountId("1010") }),
    ).toMatchObject({ ok: false });
    expect(
      await bank.saveBankAccount({ name: "Revenue?", accountId: await accountId("4000") }),
    ).toMatchObject({ ok: false });
    // The database says the same, whatever the application does.
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO bank_accounts (name, account_id, updated_at) SELECT 'x', id, now() FROM accounts WHERE code = '4000'`,
      ),
    ).rejects.toThrow(/asset account/i);
  });
});

describe("importing a statement", () => {
  it("previews without writing, then imports, then recognises the same lines", async () => {
    const preview = await importStatement(statement, true);
    expect(preview).toMatchObject({ ok: true, data: { preview: true, created: 3, existing: 0 } });
    expect(await prisma.bankLine.count({ where: { bankAccountId: bankId } })).toBe(0);

    const real = await importStatement();
    expect(real).toMatchObject({ ok: true, data: { created: 3 } });
    expect(await prisma.bankLine.count({ where: { bankAccountId: bankId } })).toBe(3);

    const again = await importStatement();
    expect(again).toMatchObject({ ok: true, data: { created: 0, existing: 3 } });
    expect(await prisma.bankLine.count({ where: { bankAccountId: bankId } })).toBe(3);
  });

  it("adds only the new lines of an overlapping statement, and keeps two identical lines in one file", async () => {
    const next = addDays(today(), -10);
    const result = await importStatement(
      csv([`${d3},Mystery credit,300.00,10275.00`, `${next},Fee,-10.00,`, `${next},Fee,-10.00,`]),
    );
    expect(result).toMatchObject({ ok: true, data: { created: 2, existing: 1 } });
    expect(await prisma.bankLine.count({ where: { bankAccountId: bankId } })).toBe(5);
  });

  it("explains what it can't read, by line", async () => {
    const result = await importStatement(csv(["not a date,x,5,", `${d1},ok line,7.00,`]), true);
    expect(result).toMatchObject({ ok: true, data: { created: 1 } });
    expect((result as { data: { problems: { line: number }[] } }).data.problems[0].line).toBe(2);
    expect(await importStatement("Date,Amount\n2026-01-01,5\n", true)).toMatchObject({ ok: false });
  });

  it("is only for people who may manage the bank", async () => {
    current = SALES;
    try {
      expect(await importStatement(statement, true)).toMatchObject({ ok: false });
    } finally {
      current = OWNER;
    }
  });
});

describe("reconciling", () => {
  it("matches by itself what is certain, and offers the rest", async () => {
    await capital("10,000", d1);
    const matched = await bank.autoMatchLines(bankId);
    expect(matched).toMatchObject({ ok: true, data: { matched: 1 } });
    const lines = (await repo.listBankLines(bankId, params("matched"))).items;
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ amountMinor: 1_000_000 });
    expect(lines[0].entryNumber).toMatch(/^JE-/);
  });

  it("books a line the books don't have: a fee is expensed and matched", async () => {
    const fee = await prisma.bankLine.findFirstOrThrow({
      where: { bankAccountId: bankId, amountMinor: -2500 },
    });
    const result = await bank.bookLine({
      lineId: fee.id,
      counterAccountId: await accountId("6600"),
    });
    expect(result.ok).toBe(true);
    expect((await prisma.bankLine.findUniqueOrThrow({ where: { id: fee.id } })).status).toBe(
      "matched",
    );
    // Money in books the other way round.
    const credit = await prisma.bankLine.findFirstOrThrow({
      where: { bankAccountId: bankId, amountMinor: 30_000 },
    });
    expect(
      (
        await bank.bookLine({
          lineId: credit.id,
          counterAccountId: await accountId("4900"),
          memo: "Interest",
        })
      ).ok,
    ).toBe(true);
    // Booking the bank against itself makes no sense.
    const other = await prisma.bankLine.findFirstOrThrow({
      where: { bankAccountId: bankId, status: "unmatched" },
    });
    expect(
      await bank.bookLine({ lineId: other.id, counterAccountId: await accountId("1010") }),
    ).toMatchObject({ ok: false });
  });

  it("refuses a match of the wrong amount, in the app and in the database", async () => {
    const line = await prisma.bankLine.findFirstOrThrow({
      where: { bankAccountId: bankId, status: "unmatched" },
    });
    const posting = await prisma.journalLine.findFirstOrThrow({
      where: { accountId: await accountId("1010"), debitMinor: 1_000_000 },
    });
    expect(await bank.matchLine({ lineId: line.id, ledgerLineId: posting.id })).toMatchObject({
      ok: false,
    });
    await expect(
      prisma.$executeRaw`UPDATE bank_lines SET status = 'matched', journal_line_id = ${posting.id}::uuid WHERE id = ${line.id}::uuid`,
    ).rejects.toThrow(/same amount and direction|already|unique/i);
    // A posting on another account can't be matched either.
    const elsewhere = await prisma.journalLine.findFirstOrThrow({
      where: { accountId: await accountId("3000") },
    });
    await expect(
      prisma.$executeRaw`UPDATE bank_lines SET status = 'matched', journal_line_id = ${elsewhere.id}::uuid WHERE id = ${line.id}::uuid`,
    ).rejects.toThrow(/own bank account/i);
  });

  it("sets a line aside only with a reason, and it can be put back", async () => {
    const line = await prisma.bankLine.findFirstOrThrow({
      where: { bankAccountId: bankId, status: "unmatched", amountMinor: -1000 },
    });
    expect(await bank.ignoreLine({ lineId: line.id, note: " " })).toMatchObject({ ok: false });
    expect(
      (await bank.ignoreLine({ lineId: line.id, note: "Bank error, reversed next day" })).ok,
    ).toBe(true);
    expect((await bank.unmatchLine(line.id)).ok).toBe(true);
    expect((await prisma.bankLine.findUniqueOrThrow({ where: { id: line.id } })).status).toBe(
      "unmatched",
    );
  });

  it("never lets what the bank said be rewritten", async () => {
    const line = await prisma.bankLine.findFirstOrThrow({ where: { bankAccountId: bankId } });
    await expect(
      prisma.$executeRaw`UPDATE bank_lines SET amount_minor = 1 WHERE id = ${line.id}::uuid`,
    ).rejects.toThrow(/cannot be changed/i);
    await expect(
      prisma.$executeRaw`DELETE FROM bank_lines WHERE id = ${line.id}::uuid`,
    ).rejects.toThrow(/cannot be deleted/i);
  });
});

describe("signing off a period", () => {
  it("refuses while lines are unresolved or the figures don't add up", async () => {
    const base = {
      bankAccountId: bankId,
      periodStart: d1,
      periodEnd: d3,
      opening: "0",
      closing: "10275.00",
    };
    // The two ₱10 fees are outside the period; d1..d3 lines are all resolved now.
    expect(await bank.signOffPeriod({ ...base, closing: "10000.00" })).toMatchObject({ ok: false });
    const unresolved = await bank.signOffPeriod({ ...base, periodEnd: today() });
    expect(unresolved).toMatchObject({ ok: false });
    expect((unresolved as { error: string }).error).toMatch(/unmatched|add up/);
  });

  it("signs off, and then nothing inside the period can move", async () => {
    const base = {
      bankAccountId: bankId,
      periodStart: d1,
      periodEnd: d3,
      opening: "0",
      closing: "10275.00",
    };
    expect((await bank.signOffPeriod(base)).ok).toBe(true);
    // Overlapping sign-off is refused.
    expect(await bank.signOffPeriod(base)).toMatchObject({ ok: false });

    const line = await prisma.bankLine.findFirstOrThrow({
      where: { bankAccountId: bankId, amountMinor: -2500 },
    });
    expect(await bank.unmatchLine(line.id)).toMatchObject({ ok: false });
    await expect(
      prisma.$executeRaw`UPDATE bank_lines SET status = 'unmatched', journal_line_id = NULL WHERE id = ${line.id}::uuid`,
    ).rejects.toThrow(/signed off/i);
    // New lines dated inside it are skipped, not imported.
    const late = await importStatement(csv([`${d2},Late arrival,5.00,`]), true);
    expect(late).toMatchObject({ ok: true, data: { created: 0, locked: 1 } });
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO bank_lines (bank_account_id, line_date, description, amount_minor, fingerprint) VALUES ('${bankId}', '${d2}', 'x', 5, 'forced')`,
      ),
    ).rejects.toThrow(/signed off/i);
    // And the sign-off itself is a record.
    await expect(prisma.$executeRaw`DELETE FROM bank_reconciliations`).rejects.toThrow(
      /signed-off reconciliation/i,
    );
    expect(await repo.listReconciliations(bankId)).toHaveLength(1);
  });
});
