import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * Links and proof. The secret in a client's link is never stored: only its SHA-256 hash is, so a
 * leaked database holds no working links. What was sent is fingerprinted the same way, so what the
 * client accepts can be shown to be exactly what we sent.
 */

/** 32 random bytes, URL safe (43 characters). */
export const generateToken = () => randomBytes(32).toString("base64url");

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const TOKEN_SHAPE = /^[A-Za-z0-9_-]{20,80}$/;

export interface Fingerprinted {
  title: string;
  intro?: string | null;
  terms?: string | null;
  paymentTerms?: string | null;
  depositPct: number;
  validUntil?: string | null;
  currency: string;
  taxRatePct: number;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  lines: {
    position: number;
    description: string;
    quantityMilli: number;
    unitLabel: string;
    unitPriceMinor: number;
    discountPct: number;
    taxable: boolean;
    totalMinor: number;
  }[];
}

/** The same content always gives the same text: fixed key order, no undefined, lines sorted by position. */
function canonical(quote: Fingerprinted): string {
  const lines = [...quote.lines]
    .sort((a, b) => a.position - b.position)
    .map((line) => [
      line.position,
      line.description,
      line.quantityMilli,
      line.unitLabel,
      line.unitPriceMinor,
      line.discountPct,
      line.taxable,
      line.totalMinor,
    ]);
  return JSON.stringify([
    quote.title,
    quote.intro ?? "",
    quote.terms ?? "",
    quote.paymentTerms ?? "",
    quote.depositPct,
    quote.validUntil ?? "",
    quote.currency,
    quote.taxRatePct,
    quote.subtotalMinor,
    quote.taxMinor,
    quote.totalMinor,
    lines,
  ]);
}

export const fingerprint = (quote: Fingerprinted) =>
  createHash("sha256").update(canonical(quote)).digest("hex");
