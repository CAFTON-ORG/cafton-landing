import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../../../scripts/pglite-setup.mjs";
import { SYSTEM_ROLE_PERMISSIONS, type Permission } from "@/lib/auth/permissions";

/**
 * The reports against a real Postgres (PGlite) built from the real migrations, after a small trading
 * history has been posted through the real actions: every report must agree with the others and with
 * the ledger, which is the point of building them from one place.
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
let reports: typeof import("./repository/reports");
let model: typeof import("./rules/reports");
let pdf: typeof import("./pdf/report-pdf");

const today = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
const accountId = async (code: string) =>
  (await prisma.account.findUniqueOrThrow({ where: { code } })).id;
const idOf = (result: unknown) => (result as { data: { id: string } }).data.id;

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
  reports = await import("./repository/reports");
  model = await import("./rules/reports");
  pdf = await import("./pdf/report-pdf");

  const books = await import("./actions/books");
  const invoices = await import("./actions/invoices");
  const payables = await import("./actions/payables");
  const expenses = await import("./actions/expenses");
  const bank = await accountId("1010");

  // Capital in.
  await books.postManualEntry({
    date: today(),
    memo: "Owner put in cash",
    lines: [
      { accountId: bank, debit: "100,000", credit: "" },
      { accountId: await accountId("3000"), debit: "", credit: "100,000" },
    ],
  });
  // An invoice for 20,000, paid 15,000 in cash and 1,000 withheld by the client (16,000 settled).
  const draft = await invoices.createInvoice({ source: "blank", clientName: "Acme" });
  await invoices.saveInvoice({
    id: idOf(draft),
    clientName: "Acme",
    issueDate: today(),
    dueDate: today(),
    lines: [
      { description: "Build", quantity: "1", unitLabel: "item", price: "20,000", taxable: false },
    ],
  });
  await invoices.issueInvoice(idOf(draft));
  await invoices.recordPayment({
    receivedDate: today(),
    amount: "15,000",
    cwt: "1,000",
    method: "bank_transfer",
    depositAccountId: bank,
    allocations: [{ invoiceId: idOf(draft), amount: "16,000" }],
  });
  // A bill for 3,000, paid 2,940 with 60 withheld from the supplier.
  const vendor = await payables.saveVendor({ name: "Hosting Co", termsDays: 15 });
  const bill = await payables.createBill({ vendorId: idOf(vendor) });
  await payables.saveBill({
    id: idOf(bill),
    vendorId: idOf(vendor),
    billDate: today(),
    dueDate: today(),
    lines: [{ description: "Hosting", accountId: await accountId("6300"), amount: "3,000" }],
  });
  await payables.approveBill(idOf(bill));
  await payables.payBill({
    billId: idOf(bill),
    paidDate: today(),
    amount: "2,940",
    wht: "60",
    method: "bank_transfer",
    paidFromAccountId: bank,
  });
  // A 500 expense from the till.
  const expense = await expenses.saveExpense({
    expenseDate: today(),
    payee: "Shell",
    description: "Fuel",
    accountId: await accountId("6990"),
    amount: "500",
    paidFromAccountId: await accountId("1000"),
  });
  await expenses.approveExpense(idOf(expense));
}, 180_000);

afterAll(async () => {
  await server?.stop();
  await db?.close();
});

const rows = (spec: {
  sections: { rows: { label: string; amounts?: (number | null)[]; kind?: string }[] }[];
}) => spec.sections.flatMap((section) => section.rows);
const figure = (spec: Parameters<typeof rows>[0], label: string) =>
  rows(spec).find((row) => row.label === label)?.amounts?.[0];

describe("the reports agree with each other and the ledger", () => {
  it("profit and loss: income less expenses is net income", async () => {
    const spec = (await reports.getReport("profit-and-loss", reports.defaultParams()))!;
    expect(figure(spec, "Total income")).toBe(2_000_000);
    expect(figure(spec, "Total expenses")).toBe(300_000 + 50_000);
    expect(figure(spec, "Net income")).toBe(2_000_000 - 350_000);
  });

  it("balance sheet: assets equal liabilities plus equity", async () => {
    const spec = (await reports.getReport("balance-sheet", reports.defaultParams()))!;
    expect(figure(spec, "Total assets")).toBe(figure(spec, "Liabilities and equity"));
    expect(rows(spec).some((row) => row.kind === "note")).toBe(false);
    expect(figure(spec, "Earnings this year")).toBe(1_650_000);
    // 100,000 + 15,000 in, 2,940 out of the bank; 500 out of the till; 4,000 still owed by the client; 1,000 of tax claimable.
    expect(figure(spec, "Total assets")).toBe(
      10_000_000 + 1_500_000 - 294_000 - 50_000 + 400_000 + 100_000,
    );
  });

  it("trial balance: debits equal credits", async () => {
    const spec = (await reports.getReport("trial-balance", reports.defaultParams()))!;
    const total = rows(spec).find((row) => row.label === "Total");
    expect(total?.amounts?.[0]).toBe(total?.amounts?.[1]);
    expect(total?.amounts?.[0]).toBeGreaterThan(0);
  });

  it("cash flow: it adds up to what the cash accounts hold", async () => {
    const spec = (await reports.getReport("cash-flow", reports.defaultParams()))!;
    const end = figure(spec, "Cash at the end");
    expect(end).toBe(10_000_000 + 1_500_000 - 294_000 - 50_000);
    expect(
      rows(spec).some((row) => row.kind === "note" && /different amount/.test(row.label)),
    ).toBe(false);
    expect(figure(spec, "Net cash from the owner")).toBe(10_000_000);
  });

  it("tax summary: gross receipts and the tax held by and from others", async () => {
    const spec = (await reports.getReport("tax-summary", reports.defaultParams()))!;
    expect(figure(spec, "Gross receipts and sales")).toBe(2_000_000);
    expect(figure(spec, "Creditable withholding tax claimed in the period")).toBe(100_000);
    expect(figure(spec, "Withheld in the period")).toBe(6_000);
    expect(figure(spec, "Output VAT charged in the period")).toBe(0);
  });

  it("a period with nothing in it gives empty reports, not errors", async () => {
    const empty = { from: "2020-01-01", to: "2020-12-31", asOf: "2020-12-31" };
    const pl = (await reports.getReport("profit-and-loss", empty))!;
    expect(figure(pl, "Net income")).toBe(0);
    const bs = (await reports.getReport("balance-sheet", empty))!;
    expect(figure(bs, "Total assets")).toBe(0);
    const cf = (await reports.getReport("cash-flow", empty))!;
    expect(figure(cf, "Cash at the end")).toBe(0);
  });

  it("reads dates from a link and falls back for nonsense", () => {
    expect(reports.readParams({ from: "2026-02-30", to: "x", asOf: "" })).toEqual(
      reports.defaultParams(),
    );
    const given = reports.readParams({ from: "2026-03-01", to: "2026-01-01" });
    expect(given.to >= given.from).toBe(true);
  });
});

describe("exporting", () => {
  it("every report makes a CSV and a PDF", async () => {
    for (const key of model.REPORT_KEYS) {
      const spec = (await reports.getReport(key, reports.defaultParams()))!;
      expect(model.reportToCsv(spec).split("\r\n").length).toBeGreaterThan(3);
      const file = await pdf.renderReportPdf(spec, {
        name: "Cafton",
        email: "contact@cafton.com",
        place: "Baguio",
      });
      expect(file.subarray(0, 5).toString()).toBe("%PDF-");
    }
  });
});
