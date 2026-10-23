import type { TableParamsConfig } from "@/lib/table-params";

export const JOURNAL_SOURCES = [
  "manual",
  "invoice",
  "credit_note",
  "payment",
  "bill",
  "expense",
  "bank",
  "reversal",
  "opening",
  "tax",
] as const;

export const JOURNAL_SOURCE_LABEL: Record<(typeof JOURNAL_SOURCES)[number], string> = {
  manual: "Entered by hand",
  invoice: "Invoice",
  credit_note: "Credit note",
  payment: "Payment",
  bill: "Bill",
  expense: "Expense",
  bank: "Bank",
  reversal: "Reversal",
  opening: "Opening balance",
  tax: "Tax",
};

/** URL-driven state of the journal. Declared once so the page and the client table parse identically. */
export const JOURNAL_TABLE: TableParamsConfig = {
  filters: { source: JOURNAL_SOURCES },
  sortable: ["date", "number"],
  defaultSort: { sort: "date", dir: "desc" },
};

export const INVOICE_STATES = ["draft", "open", "partial", "overdue", "paid", "void"] as const;

/** URL-driven state of the invoice list. */
export const INVOICE_TABLE: TableParamsConfig = {
  filters: { state: INVOICE_STATES },
  sortable: ["number", "due", "total", "created"],
  defaultSort: { sort: "created", dir: "desc" },
};

export const BILL_STATES = ["draft", "open", "partial", "overdue", "paid", "void"] as const;

/** URL-driven state of the bill list. */
export const BILL_TABLE: TableParamsConfig = {
  filters: { state: BILL_STATES },
  sortable: ["number", "due", "total", "created"],
  defaultSort: { sort: "created", dir: "desc" },
};

export const EXPENSE_STATE_FILTERS = ["submitted", "approved", "rejected", "void"] as const;

/** URL-driven state of the expense list. */
export const EXPENSE_TABLE: TableParamsConfig = {
  filters: { status: EXPENSE_STATE_FILTERS },
  sortable: ["date", "amount", "created"],
  defaultSort: { sort: "created", dir: "desc" },
};
