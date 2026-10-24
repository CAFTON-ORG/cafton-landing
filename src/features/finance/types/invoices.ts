import type { InvoiceState, InvoiceStatus, PaymentMethod } from "../rules/invoicing";

/** Plain data for the invoice screens: dates are "YYYY-MM-DD", moments ISO, money whole centavos. */

export interface InvoiceLineView {
  id: string;
  description: string;
  quantityMilli: number;
  unitLabel: string;
  unitPriceMinor: number;
  amountMinor: number;
  taxable: boolean;
  /** The milestone this line bills, if any. */
  milestoneId?: string;
}

export interface InvoiceRow {
  id: string;
  number?: string;
  status: InvoiceStatus;
  state: InvoiceState;
  clientName: string;
  organizationId?: string;
  issueDate?: string;
  dueDate?: string;
  totalMinor: number;
  balanceMinor: number;
  projectId?: string;
  projectName?: string;
  createdAt: string;
}

export interface PaymentView {
  id: string;
  number: string;
  receivedDate: string;
  amountMinor: number;
  cwtMinor: number;
  method: PaymentMethod;
  reference?: string;
  clientName: string;
  status: "recorded" | "void";
  /** What this payment settled on the invoice being shown. */
  appliedMinor?: number;
  journalEntryId: string;
  voidReason?: string;
}

export interface CreditNoteView {
  id: string;
  number: string;
  issueDate: string;
  reason: string;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  status: "issued" | "void";
  journalEntryId: string;
}

export interface InvoiceDetail extends InvoiceRow {
  organizationId?: string;
  contactId?: string;
  clientEmail?: string;
  clientAddress?: string;
  clientTin?: string;
  dealId?: string;
  dealTitle?: string;
  quoteId?: string;
  quoteReference?: string;
  taxCode: string;
  taxRateBp: number;
  subtotalMinor: number;
  taxMinor: number;
  notes?: string;
  paymentInstructions?: string;
  journalEntryId?: string;
  sentAt?: string;
  sentTo?: string;
  reminderCount: number;
  lastReminderAt?: string;
  voidedAt?: string;
  voidReason?: string;
  settledMinor: number;
  creditedMinor: number;
  lines: InvoiceLineView[];
  payments: PaymentView[];
  creditNotes: CreditNoteView[];
}

export interface OpenInvoice {
  id: string;
  number: string;
  clientName: string;
  organizationId?: string;
  dueDate: string;
  totalMinor: number;
  balanceMinor: number;
}

export interface PaymentRow extends PaymentView {
  /** Money held for the client until it is put against an invoice. */
  unappliedMinor: number;
  invoiceNumbers: string[];
}

export interface AgingRow {
  clientName: string;
  organizationId?: string;
  invoices: number;
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90: number;
  totalMinor: number;
}

export interface BillableMilestone {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  amountMinor: number;
}
