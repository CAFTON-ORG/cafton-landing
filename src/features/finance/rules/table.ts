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

/** "awaiting" is what is still owed (open or part paid); the others are filed under their own name. */
export const INVOICE_STATES = [
  "draft",
  "awaiting",
  "open",
  "partial",
  "overdue",
  "paid",
  "void",
] as const;

/** URL-driven state of the invoice list. */
export const INVOICE_TABLE: TableParamsConfig = {
  filters: { state: INVOICE_STATES },
  sortable: ["number", "due", "total", "created"],
  defaultSort: { sort: "created", dir: "desc" },
};

export const BILL_STATES = [
  "draft",
  "awaiting",
  "open",
  "partial",
  "overdue",
  "paid",
  "void",
] as const;

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

export const BANK_LINE_STATUSES = ["unmatched", "matched", "ignored"] as const;

/** URL-driven state of a bank account's statement lines: what still needs a decision comes first. */
export const BANK_LINE_TABLE: TableParamsConfig = {
  filters: { status: BANK_LINE_STATUSES },
  sortable: ["date", "amount"],
  defaultSort: { sort: "date", dir: "desc" },
};
