import type { ContractKind, ContractStatus } from "./rules";

export interface TemplateView {
  id: string;
  name: string;
  kind: ContractKind;
  body: string;
  active: boolean;
  /** How many contracts were made from it; a used template is kept, not deleted. */
  used: number;
}

/** One row of the contracts list. */
export interface ContractRow {
  id: string;
  reference: string;
  kind: ContractKind;
  title: string;
  status: ContractStatus;
  dealId: string;
  dealTitle: string;
  contactName: string;
  quoteReference?: string;
  createdByName?: string;
  createdByAvatar?: string;
  validUntil?: string;
  sentAt?: string;
  acceptedAt?: string;
  createdAt: string;
}

export interface ContractView extends ContractRow {
  body: string;
  quoteId?: string;
  templateName?: string;
  /** The contact's email, so staff can see where it will go. */
  contactEmail?: string;
  hasLink: boolean;
  sentTo?: string;
  viewedAt?: string;
  acceptedByName?: string;
  acceptedByEmail?: string;
  declinedAt?: string;
  declinedReason?: string;
  withdrawnAt?: string;
  withdrawnReason?: string;
}

/** What a client sees at the public link: the agreement and nothing internal. */
export interface PublicContract {
  reference: string;
  kind: ContractKind;
  title: string;
  body: string;
  status: ContractStatus;
  validUntil?: string;
  issuedOn?: string;
  recipientName: string;
  acceptedAt?: string;
  acceptedByName?: string;
  declinedAt?: string;
  withdrawnAt?: string;
}

/** An accepted quote the contract can be made from. */
export interface QuoteChoice {
  id: string;
  reference: string;
  version: number;
  title: string;
  totalMinor: number;
}
