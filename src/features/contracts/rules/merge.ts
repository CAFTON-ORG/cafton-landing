/**
 * Templates are plain text with {{merge_fields}}. A field is replaced with the deal's own details
 * when a contract is made from the template, so one template serves every client. Pure, so it is
 * tested without a database.
 */

export const MERGE_FIELDS = [
  { key: "client_name", label: "Client name", needsQuote: false },
  { key: "client_email", label: "Client email", needsQuote: false },
  { key: "client_company", label: "Client company", needsQuote: false },
  { key: "company_name", label: "Our company name", needsQuote: false },
  { key: "deal_title", label: "Deal title", needsQuote: false },
  { key: "deal_reference", label: "Deal number", needsQuote: false },
  { key: "today", label: "Today's date", needsQuote: false },
  { key: "quote_reference", label: "Quote number", needsQuote: true },
  { key: "quote_scope", label: "What the quote includes (list)", needsQuote: true },
  { key: "quote_total", label: "Quote total", needsQuote: true },
  { key: "quote_deposit", label: "Deposit due on signing", needsQuote: true },
  { key: "quote_balance", label: "Balance due on completion", needsQuote: true },
  { key: "payment_terms", label: "Payment terms from the quote", needsQuote: true },
] as const;

export type MergeKey = (typeof MERGE_FIELDS)[number]["key"];

const KNOWN = new Set<string>(MERGE_FIELDS.map((field) => field.key));
const NEEDS_QUOTE = new Set<string>(
  MERGE_FIELDS.filter((field) => field.needsQuote).map((field) => field.key),
);
const FIELD = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Every field used in the text, once each, in order of first use. */
export function fieldsIn(body: string): string[] {
  const found: string[] = [];
  for (const match of body.matchAll(FIELD)) {
    if (!found.includes(match[1])) found.push(match[1]);
  }
  return found;
}

export const unknownFields = (body: string) => fieldsIn(body).filter((key) => !KNOWN.has(key));

/** True when the text uses details that only a quote can supply. */
export const needsQuote = (body: string) => fieldsIn(body).some((key) => NEEDS_QUOTE.has(key));

export function fillTemplate(body: string, values: Partial<Record<MergeKey, string>>): string {
  return (
    body
      .replace(FIELD, (_whole, key: string) => values[key as MergeKey] ?? "")
      // A field left empty (no company, say) must not leave a gap of spaces behind.
      .replace(/[ 	]{2,}/g, " ")
      .replace(/[ 	]+$/gm, "")
  );
}
