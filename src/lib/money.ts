/**
 * Money is an integer count of minor units (centavos) plus an ISO 4217 code.
 * Never a float: 0.1 + 0.2 is not 0.3, and ledgers must add up exactly.
 * These helpers are the only place text and minor units are converted.
 */

export const DEFAULT_CURRENCY = "PHP";

/** Decimal places of the currencies Cafton deals in. Everything else defaults to 2. */
const MINOR_DIGITS: Record<string, number> = { JPY: 0, KRW: 0 };

export function minorDigits(currency: string): number {
  return MINOR_DIGITS[currency] ?? 2;
}

/**
 * "12,500.50" -> 1250050. Returns null for anything that is not a plain,
 * non-negative amount with at most the currency's decimals (so "1.234" is
 * rejected rather than silently rounded).
 */
export function parseMinor(input: string, currency = DEFAULT_CURRENCY): number | null {
  const text = input
    .trim()
    .replace(/[\s,]/g, "")
    .replace(/^[₱$€£]/, "");
  const digits = minorDigits(currency);
  const pattern = digits === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${digits}})?$`);
  if (!pattern.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const minor = Number(whole + fraction.padEnd(digits, "0"));
  return Number.isSafeInteger(minor) ? minor : null;
}

/** 1250050 -> "₱12,500.50". Whole amounts drop the decimals when `compact` is set. */
export function formatMinor(
  minor: number | null | undefined,
  currency = DEFAULT_CURRENCY,
  options: { compact?: boolean } = {},
): string {
  if (minor === null || minor === undefined) return "—";
  const digits = minorDigits(currency);
  const value = minor / 10 ** digits;
  const whole = Number.isInteger(value);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: options.compact && whole ? 0 : digits,
    maximumFractionDigits: options.compact && whole ? 0 : digits,
  }).format(value);
}

/** The text a form field should show for an existing amount: "12500.50", or "" when unset. */
export function minorToInput(
  minor: number | null | undefined,
  currency = DEFAULT_CURRENCY,
): string {
  if (minor === null || minor === undefined) return "";
  const digits = minorDigits(currency);
  return (minor / 10 ** digits).toFixed(digits);
}

/** Probability-weighted total in minor units, rounded to a whole minor unit. */
export function weightedMinor(
  items: readonly { amountMinor: number | null; probability: number }[],
): number {
  return Math.round(
    items.reduce((sum, item) => sum + ((item.amountMinor ?? 0) * item.probability) / 100, 0),
  );
}
