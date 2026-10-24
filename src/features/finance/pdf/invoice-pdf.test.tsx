import { describe, expect, it } from "vitest";

import type { InvoiceDetail } from "../types/invoices";
import { renderInvoicePdf } from "./invoice-pdf";

const company = { name: "Cafton", email: "contact@cafton.com", place: "Baguio City, Philippines" };

const line = (index: number) => ({
  id: `line-${index}`,
  description: `Line ${index}`,
  quantityMilli: 1000,
  unitLabel: "item",
  unitPriceMinor: 250_000,
  amountMinor: 250_000,
  taxable: false,
});

const invoice = (lines: number): InvoiceDetail => ({
  id: "inv",
  number: "INV-2026-0001",
  status: "issued",
  state: "partial",
  clientName: "Acme Corp",
  issueDate: "2026-10-23",
  dueDate: "2026-11-07",
  totalMinor: 250_000 * lines,
  balanceMinor: 200_000,
  createdAt: "2026-10-23T00:00:00Z",
  taxCode: "NOVAT",
  taxRateBp: 0,
  subtotalMinor: 250_000 * lines,
  taxMinor: 0,
  reminderCount: 0,
  settledMinor: 250_000 * lines - 200_000,
  creditedMinor: 0,
  lines: Array.from({ length: lines }, (_, index) => line(index + 1)),
  payments: [],
  creditNotes: [],
});

const pages = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;

describe("invoice PDF", () => {
  it("renders a valid PDF", async () => {
    const pdf = await renderInvoicePdf(invoice(2), company);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pages(pdf)).toBe(1);
  });

  it("runs onto more pages when there are many lines", async () => {
    const pdf = await renderInvoicePdf(invoice(60), company);
    expect(pages(pdf)).toBeGreaterThan(1);
  });
});
