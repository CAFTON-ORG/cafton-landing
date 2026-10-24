/** Plain data for the bank screens: dates are "YYYY-MM-DD", moments ISO, money whole centavos. */

export type BankLineStatus = "unmatched" | "matched" | "ignored";

export interface BankAccountView {
  id: string;
  name: string;
  accountId: string;
  /** "1010 Cash in bank". */
  accountName: string;
  numberHint?: string;
  active: boolean;
  /** What the books say is in the account today. */
  ledgerBalanceMinor: number;
  unmatchedCount: number;
  lineCount: number;
  lastImportAt?: string;
  /** The last day covered by a signed-off statement. */
  signedOffThrough?: string;
}

export interface BankLineRow {
  id: string;
  date: string;
  description: string;
  reference?: string;
  amountMinor: number;
  balanceMinor?: number;
  status: BankLineStatus;
  note?: string;
  /** The posting it was put against. */
  entryId?: string;
  entryNumber?: string;
  /** In a signed-off period, so it can't change. */
  locked: boolean;
}

export interface ReconciliationView {
  id: string;
  periodStart: string;
  periodEnd: string;
  openingMinor: number;
  closingMinor: number;
  lineCount: number;
  signedByName: string;
  createdAt: string;
}

export interface ImportReport {
  /** True when nothing was written: this is the preview. */
  preview: boolean;
  total: number;
  /** Lines that are new. */
  created: number;
  /** Lines already imported earlier, skipped. */
  existing: number;
  /** Lines dated inside a signed-off period, skipped. */
  locked: number;
  problems: { line: number; message: string }[];
  understood: string[];
  firstDate?: string;
  lastDate?: string;
  /** The first few lines as they were read, so the dates and amounts can be checked by eye. */
  sample: { date: string; description: string; amountMinor: number }[];
}

export interface BookingAccount {
  id: string;
  code: string;
  name: string;
  type: string;
}
