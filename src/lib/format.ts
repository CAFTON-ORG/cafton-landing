/** Display formatting shared by every feature. Pure functions, locale-aware, no React. */

const DEFAULT_LOCALE = "en-US";

export function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, options).format(new Date(value));
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(DEFAULT_LOCALE, options).format(value);
}

export function formatCurrency(value: number, currency = "USD") {
  return formatNumber(value, { style: "currency", currency, maximumFractionDigits: 0 });
}

export function formatPercent(value: number) {
  return formatNumber(value / 100, { style: "percent", maximumFractionDigits: 0 });
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** "5 minutes ago", "yesterday", "in 3 days". `now` is injectable for tests. */
export function formatRelative(value: string | Date, now: Date = new Date()) {
  const seconds = Math.round((new Date(value).getTime() - now.getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(DEFAULT_LOCALE, { numeric: "auto" });

  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

/** "Ada Lovelace" → "AL"; falls back to the first letter of the email. */
export function getInitials(name?: string | null, email?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (email?.[0] ?? "?").toUpperCase();
}
