import type { BillState, BillStatus } from "./payables";
import type { PaymentMethod } from "./invoicing";

/** Plain data for the payables screens: dates are "YYYY-MM-DD", moments ISO, money whole centavos. */

export interface VendorView {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tin?: string;
  defaultAccountId?: string;
  defaultAccountName?: string;
  termsDays: number;
  notes?: string;
  active: boolean;
  billCount: number;
  /** Approved bills not yet paid in full. */
  owedMinor: number;
}

export interface BillRow {
  id: string;
  number?: string;
  status: BillStatus;
  state: BillState;
  vendorId: string;
  vendorName: string;
  vendorRef?: string;
  billDate: string;
  dueDate: string;
  totalMinor: number;
  balanceMinor: number;
  createdAt: string;
}

export interface BillLineView {
  id: string;
  description: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  amountMinor: number;
}

export interface BillPaymentView {
  id: string;
  number: string;
  paidDate: string;
  amountMinor: number;
  whtMinor: number;
  method: PaymentMethod;
  reference?: string;
  paidFromName: string;
  status: "recorded" | "void";
  journalEntryId: string;
  voidReason?: string;
}

export interface BillDetail extends BillRow {
  notes?: string;
  journalEntryId?: string;
  approvedAt?: string;
  voidedAt?: string;
  voidReason?: string;
  paidMinor: number;
  vendorActive: boolean;
  vendorTermsDays: number;
  lines: BillLineView[];
  payments: BillPaymentView[];
}

export interface OpenBill {
  id: string;
  number: string;
  vendorId: string;
  vendorName: string;
  dueDate: string;
  totalMinor: number;
  balanceMinor: number;
}

export interface PayableAgingRow {
  vendorId: string;
  vendorName: string;
  bills: number;
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90: number;
  totalMinor: number;
}

export interface BillAccount {
  id: string;
  code: string;
  name: string;
  systemKey?: string;
}
