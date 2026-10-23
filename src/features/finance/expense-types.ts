import type { ExpenseStatus } from "./expenses";

/** Plain data for the expense screens: dates are "YYYY-MM-DD", moments ISO, money whole centavos. */

export interface ExpenseRow {
  id: string;
  number?: string;
  status: ExpenseStatus;
  expenseDate: string;
  payee: string;
  description: string;
  accountName: string;
  amountMinor: number;
  submittedBy?: string;
  submittedByName: string;
  receiptCount: number;
  createdAt: string;
}

export interface ReceiptView {
  id: string;
  name: string;
  mime: string;
  sizeBytes: number;
  uploadedByName: string;
  uploadedBy?: string;
  createdAt: string;
}

export interface ExpenseDetail extends ExpenseRow {
  vendorId?: string;
  accountId: string;
  paidFromAccountId: string;
  paidFromName: string;
  notes?: string;
  decidedByName?: string;
  decidedAt?: string;
  rejectReason?: string;
  voidReason?: string;
  voidedAt?: string;
  journalEntryId?: string;
  receipts: ReceiptView[];
}
