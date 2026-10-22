import type { QuoteStatus } from "./rules";

export type PricingModel = "fixed" | "hourly" | "retainer";

export const PRICING_MODELS: readonly PricingModel[] = ["fixed", "hourly", "retainer"];

export const PRICING_MODEL_LABEL: Record<PricingModel, string> = {
  fixed: "Fixed price",
  hourly: "Hourly",
  retainer: "Monthly retainer",
};

/** What one unit is called by default for each way of charging. */
export const DEFAULT_UNIT: Record<PricingModel, string> = {
  fixed: "project",
  hourly: "hour",
  retainer: "month",
};

export interface CatalogItemView {
  id: string;
  name: string;
  description?: string;
  pricingModel: PricingModel;
  /** Integer centavos per unit. */
  unitPriceMinor: number;
  unitLabel: string;
  taxable: boolean;
  active: boolean;
}

export interface QuoteLineView {
  id: string;
  position: number;
  catalogItemId?: string;
  description: string;
  quantityMilli: number;
  unitLabel: string;
  unitPriceMinor: number;
  discountPct: number;
  taxable: boolean;
  totalMinor: number;
}

export interface QuoteView {
  id: string;
  reference: string;
  version: number;
  /** The newest version of this quote. */
  isLatest: boolean;
  dealId: string;
  dealTitle: string;
  dealReference: string;
  contactId: string;
  contactName: string;
  contactEmail?: string;
  title: string;
  intro?: string;
  terms?: string;
  paymentTerms?: string;
  depositPct: number;
  currency: string;
  /** What to show: a sent quote past its date reads as expired. */
  status: QuoteStatus;
  taxRatePct: number;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  /** yyyy-mm-dd */
  validUntil?: string;
  hasLink: boolean;
  approvedAt?: string;
  approvedByName?: string;
  sentAt?: string;
  sentTo?: string;
  viewedAt?: string;
  acceptedAt?: string;
  acceptedByName?: string;
  acceptedByEmail?: string;
  declinedAt?: string;
  declinedReason?: string;
  createdByName?: string;
  createdByAvatar?: string;
  withdrawnAt?: string;
  withdrawnReason?: string;
  createdAt: string;
  lines: QuoteLineView[];
}

/** One row of the quotes list. */
export interface QuoteRow {
  id: string;
  reference: string;
  version: number;
  title: string;
  status: QuoteStatus;
  totalMinor: number;
  currency: string;
  dealId: string;
  dealTitle: string;
  contactName: string;
  createdByName?: string;
  createdByAvatar?: string;
  validUntil?: string;
  sentAt?: string;
  createdAt: string;
}

/** What a client sees at the public link: the offer and nothing internal. */
export interface PublicQuote {
  reference: string;
  version: number;
  title: string;
  intro?: string;
  terms?: string;
  paymentTerms?: string;
  depositPct: number;
  currency: string;
  status: QuoteStatus;
  taxRatePct: number;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  validUntil?: string;
  recipientName: string;
  acceptedAt?: string;
  acceptedByName?: string;
  declinedAt?: string;
  withdrawnAt?: string;
  /** When it was made, for the issue date on the document. */
  issuedOn?: string;
  lines: Pick<
    QuoteLineView,
    "description" | "quantityMilli" | "unitLabel" | "unitPriceMinor" | "discountPct" | "totalMinor"
  >[];
}
