/**
 * Quote arithmetic. Pure and exact: money is whole centavos and quantities are whole thousandths,
 * and the multiplication is done in BigInt because price times quantity can pass 2^53.
 * Rounding is half up, line by line, so the figures on the page always add up to the total.
 */

export interface PricedLine {
  unitPriceMinor: number;
  /** Thousandths: 1.5 hours is 1500. */
  quantityMilli: number;
  /** Whole percent, 0 to 100. */
  discountPct: number;
  taxable: boolean;
}

export interface Totals {
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
}

/** Divides and rounds half up (for non-negative numbers). */
const ZERO = BigInt(0);
const TWO = BigInt(2);
const HUNDRED = BigInt(100);
const THOUSAND = BigInt(1000);

const divRound = (numerator: bigint, denominator: bigint) =>
  (numerator + denominator / TWO) / denominator;

export function lineTotal(
  line: Pick<PricedLine, "unitPriceMinor" | "quantityMilli" | "discountPct">,
): number {
  const gross = divRound(BigInt(line.unitPriceMinor) * BigInt(line.quantityMilli), THOUSAND);
  const net = divRound(gross * BigInt(100 - line.discountPct), HUNDRED);
  return Number(net);
}

export function quoteTotals(lines: readonly PricedLine[], taxRatePct: number): Totals {
  let subtotal = ZERO;
  let taxableBase = ZERO;
  for (const line of lines) {
    const total = BigInt(lineTotal(line));
    subtotal += total;
    if (line.taxable) taxableBase += total;
  }
  const tax = divRound(taxableBase * BigInt(taxRatePct), HUNDRED);
  return {
    subtotalMinor: Number(subtotal),
    taxMinor: Number(tax),
    totalMinor: Number(subtotal + tax),
  };
}

/** "1.5" -> 1500; null when it is not a positive number with at most three decimals. */
export function parseQuantity(input: string): number | null {
  const text = input.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,3})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const milli = Number(whole + fraction.padEnd(3, "0"));
  return milli > 0 && milli <= 1_000_000 ? milli : null;
}

/** 1500 -> "1.5", 2000 -> "2". */
export const quantityText = (milli: number) => String(milli / 1000);
