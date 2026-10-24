import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../../../scripts/pglite-setup.mjs";
import { SYSTEM_ROLE_PERMISSIONS, type Permission } from "@/lib/auth/permissions";

/**
 * Expenses against a real Postgres (PGlite) built from the real migrations: submitting, approving
 * (which posts to the books), sending back, voiding, who may do what, and that the database itself
 * keeps an approved expense and its receipts as they were.
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
let actions: typeof import("./actions/expenses");
let repo: typeof import("./repository/expenses");
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
  actions = await import("./actions/expenses");
  repo = await import("./repository/expenses");
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
const accountId = async (code: string) =>
  (await prisma.account.findUniqueOrThrow({ where: { code } })).id;

async function submit(
  amount = "850",
  paidFromCode = "1000",
  overrides: Record<string, string> = {},
) {
  const result = await actions.saveExpense({
    expenseDate: today(),
    payee: "Shell",
    description: "Fuel for the site visit",
    accountId: await accountId("6990"),
    amount,
    paidFromAccountId: await accountId(paidFromCode),
    ...overrides,
  });
  if (!result.ok) throw new Error(result.error);
  return idOf(result);
}

/** Receipts normally arrive through storage; here one is recorded directly. */
const attachReceipt = (expenseId: string) =>
  prisma.expenseReceipt.create({
    data: {
      expenseId,
      path: `finance/${crypto.randomUUID()}.pdf`,
      name: "receipt.pdf",
      mime: "application/pdf",
      sizeBytes: 1000,
    },
  });

describe("approving an expense", () => {
  it("numbers it, posts it to the books and fixes it", async () => {
    const [cost, cash] = [await balance("6990"), await balance("1000")];
    const id = await submit("850");
    const approved = await actions.approveExpense(id);
    expect(approved.ok).toBe(true);
    expect((approved as { data: { number: string } }).data.number).toMatch(/^EXP-\d{4}-\d{4}$/);

    expect(await balance("6990")).toBe(cost + 85_000);
    expect(await balance("1000")).toBe(cash - 85_000);
    expect(await repo.getExpense(id)).toMatchObject({ status: "approved", amountMinor: 85_000 });

    // The application refuses an edit with a reason...
    expect(
      await actions.saveExpense({
        id,
        expenseDate: today(),
        payee: "Someone else",
        description: "Changed",
        accountId: await accountId("6990"),
        amount: "1",
        paidFromAccountId: await accountId("1000"),
      }),
    ).toMatchObject({ ok: false });
    // ...and so does the database, whatever the application does.
    await expect(
      prisma.$executeRaw`UPDATE expenses SET amount_minor = 1 WHERE id = ${id}::uuid`,
    ).rejects.toThrow(/approved expense/i);
    await expect(prisma.$executeRaw`DELETE FROM expenses WHERE id = ${id}::uuid`).rejects.toThrow(
      /approved expense/i,
    );
    await expect(attachReceipt(id)).rejects.toThrow(/receipts of an approved expense/i);
  });

  it("books what someone paid out of pocket as money owed back to them", async () => {
    const owed = await balance("2150");
    const id = await submit("300", "2150");
    await actions.approveExpense(id);
    expect(await balance("2150")).toBe(owed - 30_000);
  });

  it("needs a receipt above the threshold", async () => {
    const id = await submit("2,500");
    expect(await actions.approveExpense(id)).toMatchObject({ ok: false });
    await attachReceipt(id);
    expect((await actions.approveExpense(id)).ok).toBe(true);
  });

  it("is only for people who may approve", async () => {
    const id = await submit("100");
    current = SALES;
    try {
      expect(await actions.approveExpense(id)).toMatchObject({ ok: false });
    } finally {
      current = OWNER;
    }
    expect((await repo.getExpense(id))?.status).toBe("submitted");
  });

  it("leaves no gap in the numbers when an approval is refused", async () => {
    const first = (await actions.approveExpense(await submit("10"))) as {
      data: { number: string };
    };
    const refused = await submit("5,000"); // over the threshold, no receipt
    expect(await actions.approveExpense(refused)).toMatchObject({ ok: false });
    const next = (await actions.approveExpense(await submit("10"))) as { data: { number: string } };
    const seq = (n: string) => Number(n.split("-")[2]);
    expect(seq(next.data.number)).toBe(seq(first.data.number) + 1);
  });
});

describe("sending back", () => {
  it("needs a reason, and editing a sent-back expense puts it up for approval again", async () => {
    const id = await submit("120");
    expect(await actions.rejectExpense({ id, reason: " " })).toMatchObject({ ok: false });
    expect((await actions.rejectExpense({ id, reason: "Wrong account" })).ok).toBe(true);
    expect(await repo.getExpense(id)).toMatchObject({
      status: "rejected",
      rejectReason: "Wrong account",
    });

    const again = await actions.saveExpense({
      id,
      expenseDate: today(),
      payee: "Shell",
      description: "Fuel, corrected",
      accountId: await accountId("6990"),
      amount: "120",
      paidFromAccountId: await accountId("1000"),
    });
    expect(again.ok).toBe(true);
    expect(await repo.getExpense(id)).toMatchObject({
      status: "submitted",
      rejectReason: undefined,
    });
  });
});

describe("voiding", () => {
  it("reverses the posting and keeps the record", async () => {
    const [cost, cash] = [await balance("6990"), await balance("1000")];
    const id = await submit("400");
    await actions.approveExpense(id);
    expect((await actions.voidExpense({ id, reason: "Duplicate" })).ok).toBe(true);
    expect([await balance("6990"), await balance("1000")]).toEqual([cost, cash]);
    expect((await repo.getExpense(id))?.status).toBe("void");
    expect(await actions.voidExpense({ id, reason: "again" })).toMatchObject({ ok: false });
  });

  it("only applies to an approved expense", async () => {
    const id = await submit("50");
    expect(await actions.voidExpense({ id, reason: "x" })).toMatchObject({ ok: false });
  });
});

describe("who may see and change what", () => {
  it("lets anyone who can submit do so, but shows them only their own", async () => {
    current = SALES;
    let mine: string;
    try {
      mine = await submit("77");
    } finally {
      current = OWNER;
    }
    const ownerOnes = await submit("88");

    const params = {
      q: "",
      page: 1,
      pageSize: 50,
      sort: "created",
      dir: "desc",
      filters: {},
    } as never;
    const salesSees = await repo.listExpenses(params, { actorId: SALES.id, viewAll: false });
    expect(salesSees.items.map((item) => item.id)).toContain(mine);
    expect(salesSees.items.map((item) => item.id)).not.toContain(ownerOnes);
    const ownerSees = await repo.listExpenses(params, { actorId: OWNER.id, viewAll: true });
    expect(ownerSees.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([mine, ownerOnes]),
    );
  });

  it("stops one person editing or withdrawing another's expense", async () => {
    current = SALES;
    const mine = await submit("20");
    current = OWNER;
    const theirs = await submit("30");
    current = SALES;
    try {
      expect(
        await actions.saveExpense({
          id: theirs,
          expenseDate: today(),
          payee: "x",
          description: "y",
          accountId: await accountId("6990"),
          amount: "1",
          paidFromAccountId: await accountId("1000"),
        }),
      ).toMatchObject({ ok: false });
      expect(await actions.withdrawExpense(theirs)).toMatchObject({ ok: false });
      expect((await actions.withdrawExpense(mine)).ok).toBe(true);
    } finally {
      current = OWNER;
    }
    // An approver may withdraw someone else's that is still waiting.
    expect((await actions.withdrawExpense(theirs)).ok).toBe(true);
  });

  it("refuses a revenue account and an account money cannot come from", async () => {
    expect(
      await submit("10", "1000", { accountId: await accountId("4000") }).catch((e) => e),
    ).toBeInstanceOf(Error);
    expect(
      await submit("10", "1000", { paidFromAccountId: await accountId("6990") }).catch((e) => e),
    ).toBeInstanceOf(Error);
  });
});

describe("receipts", () => {
  it("are refused without storage set up, with a plain explanation", async () => {
    const id = await submit("60");
    const form = new FormData();
    form.set("expenseId", id);
    form.set("file", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "r.pdf"));
    const result = await actions.uploadReceipt(form);
    expect(result).toMatchObject({ ok: false });
    expect((result as { error: string }).error).toMatch(/storage/i);
  });
});
