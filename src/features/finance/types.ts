import type { AccountType, PeriodStatus } from "./rules";

/** Plain data for the screens: dates are "YYYY-MM-DD", moments are ISO strings, money is whole centavos. */

export interface AccountView {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  description?: string;
  /** The role the system posts to this account by, if any ("ar", "cash"...). */
  systemKey?: string;
  active: boolean;
  /** Debits less credits over all time. */
  debitMinor: number;
  creditMinor: number;
  /** The balance on the account's normal side (positive when it is where it should be). */
  balanceMinor: number;
  /** Postings exist, so the type is locked. */
  used: boolean;
}

export interface PeriodView {
  year: number;
  month: number;
  startsOn: string;
  endsOn: string;
  status: PeriodStatus;
  closedAt?: string;
  closedByName?: string;
  /** Entries dated in the month. */
  entries: number;
}

export interface TaxRateView {
  id: string;
  code: string;
  name: string;
  rateBp: number;
  kind: "vat" | "percentage" | "withholding";
  active: boolean;
}

export interface JournalRow {
  id: string;
  number: string;
  entryDate: string;
  memo: string;
  sourceKind: string;
  /** Total of the debits (equal to the credits). */
  totalMinor: number;
  createdByName: string;
  createdAt: string;
  reversesNumber?: string;
  reversedByNumber?: string;
}

export interface JournalLineView {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debitMinor: number;
  creditMinor: number;
  memo?: string;
}

export interface JournalDetail extends JournalRow {
  sourceId?: string;
  reversesId?: string;
  reversedById?: string;
  lines: JournalLineView[];
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  debitMinor: number;
  creditMinor: number;
}
