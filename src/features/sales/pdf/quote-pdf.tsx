import {
  Document,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
  type TextProps,
} from "@react-pdf/renderer";
import type { ReactNode } from "react";

import { LOGO_PATH_D } from "@/components/shared/logo";
import { quantityText } from "../rules/pricing";
import { QUOTE_STATUS_LABEL } from "../rules/core";
import type { PublicQuote } from "../types";

/**
 * The quote as a branded A4 document. The built-in PDF fonts have no peso sign, so amounts read
 * "PHP 12,500.00", which is also how a bank or an accountant writes them. The logo is drawn from
 * its vector path, so it is sharp at any zoom and the PDF never reads an image file at run time.
 */
const INK = "#111111";
const MUTED = "#5f6368";
const LINE = "#dcdcdc";
const SOFT = "#f3f3f3";

const money = (minor: number, currency: string) =>
  `${currency} ${(minor / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDay = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "UTC" }).format(
        new Date(`${value.slice(0, 10)}T00:00:00Z`),
      )
    : "";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: INK,
  },
  // Absolute point values, not multipliers: on a text node react-pdf reads a unitless line height
  // as roughly double (26pt for 10pt type), and a page-level one makes the footer vanish.
  text: { lineHeight: "14.5pt" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  brand: { flexDirection: "row", alignItems: "center" },
  mark: { width: 30, height: 35, marginRight: 10 },
  company: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    lineHeight: "20pt",
  },
  companyMeta: { fontSize: 9, color: MUTED, marginTop: 2, lineHeight: "12pt" },
  titleBlock: { alignItems: "flex-end" },
  title: { fontFamily: "Helvetica-Bold", fontSize: 22, lineHeight: "25pt" },
  number: { fontSize: 11, marginTop: 6, lineHeight: "15pt" },
  status: { fontSize: 9, color: MUTED, marginTop: 3, lineHeight: "13pt" },
  meta: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: LINE,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 10,
    marginBottom: 18,
  },
  metaCol: { flex: 1, paddingRight: 8 },
  metaColWide: { flex: 1.5, paddingRight: 10 },
  label: {
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
    lineHeight: "11pt",
  },
  strong: { fontFamily: "Helvetica-Bold" },
  h2: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    marginTop: 16,
    marginBottom: 5,
    lineHeight: "16pt",
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: INK,
    color: "#ffffff",
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    lineHeight: "13pt",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
  },
  colDescription: { width: "42%", paddingRight: 8 },
  colQty: { width: "16%", textAlign: "right" },
  colPrice: { width: "20%", textAlign: "right" },
  colTotal: { width: "22%", textAlign: "right" },
  totals: { marginTop: 10, alignSelf: "flex-end", width: "56%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 4,
    backgroundColor: SOFT,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    lineHeight: "16pt",
  },
  split: { marginTop: 8, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: LINE },
  stamp: {
    marginTop: 18,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: INK,
    borderRadius: 4,
  },
  stampText: { fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: LINE,
  },
  footerText: { fontSize: 8, color: MUTED, textAlign: "center" },
});

/**
 * Body text with the document's line height. It is set per text, not on the page: with a page-level
 * line height react-pdf draws no `render` text, which made the "page X of Y" footer disappear.
 */
function P({ style, ...props }: TextProps & { children?: ReactNode }) {
  return (
    <Text
      {...props}
      style={[styles.text, ...(Array.isArray(style) ? style : style ? [style] : [])]}
    />
  );
}

export function QuoteDocument({
  quote,
  company,
}: {
  quote: PublicQuote;
  company: { name: string; email: string; place: string };
}) {
  const { currency } = quote;
  const deposit = Math.round((quote.totalMinor * quote.depositPct) / 100);
  const balance = quote.totalMinor - deposit;
  const stamp =
    quote.status === "accepted"
      ? `Accepted by ${quote.acceptedByName} on ${formatDay(quote.acceptedAt)}. This is a record of what was agreed.`
      : quote.status === "declined"
        ? "This quote was declined."
        : quote.status === "withdrawn"
          ? "This quote was withdrawn and is no longer open."
          : quote.status === "expired"
            ? `This quote expired on ${formatDay(quote.validUntil)}.`
            : quote.status === "superseded"
              ? "A newer version of this quote replaced this one."
              : null;

  return (
    <Document
      title={`${quote.reference} ${quote.title}`}
      author={company.name}
      subject={quote.title}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Svg viewBox="0 0 36 42" style={styles.mark}>
              <Path d={LOGO_PATH_D} fill={INK} />
            </Svg>
            <View>
              <P style={styles.company}>{company.name}</P>
              <P style={styles.companyMeta}>
                {[company.email, company.place].filter(Boolean).join("  ·  ")}
              </P>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <P style={styles.title}>Quotation</P>
            <P style={styles.number}>
              {quote.reference}
              {quote.version > 1 ? `  ·  version ${quote.version}` : ""}
            </P>
            {quote.status !== "sent" && (
              <P style={styles.status}>{QUOTE_STATUS_LABEL[quote.status]}</P>
            )}
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaCol}>
            <P style={styles.label}>Prepared for</P>
            <P style={styles.strong}>{quote.recipientName}</P>
          </View>
          <View style={styles.metaColWide}>
            <P style={styles.label}>Project</P>
            <P style={styles.strong}>{quote.title}</P>
          </View>
          <View style={styles.metaCol}>
            <P style={styles.label}>Issued</P>
            <P>{formatDay(quote.issuedOn) || "—"}</P>
          </View>
          <View style={styles.metaCol}>
            <P style={styles.label}>Valid until</P>
            <P>{formatDay(quote.validUntil) || "—"}</P>
          </View>
        </View>

        {quote.intro && <P style={{ marginBottom: 14 }}>{quote.intro}</P>}

        <View style={styles.tableHead} fixed minPresenceAhead={60}>
          <P style={styles.colDescription}>Description</P>
          <P style={styles.colQty}>Qty</P>
          <P style={styles.colPrice}>Unit price</P>
          <P style={styles.colTotal}>Amount</P>
        </View>
        {quote.lines.map((line, index) => (
          <View key={index} style={styles.row} wrap={false}>
            <View style={styles.colDescription}>
              <P>{line.description}</P>
              {line.discountPct > 0 && <P style={{ color: MUTED }}>{line.discountPct}% discount</P>}
            </View>
            <P style={styles.colQty}>
              {quantityText(line.quantityMilli)} {line.unitLabel}
            </P>
            <P style={styles.colPrice}>{money(line.unitPriceMinor, currency)}</P>
            <P style={styles.colTotal}>{money(line.totalMinor, currency)}</P>
          </View>
        ))}

        <View style={styles.totals} wrap={false}>
          <View style={styles.totalRow}>
            <P>Subtotal</P>
            <P>{money(quote.subtotalMinor, currency)}</P>
          </View>
          {quote.taxRatePct > 0 && (
            <View style={styles.totalRow}>
              <P>VAT ({quote.taxRatePct}%)</P>
              <P>{money(quote.taxMinor, currency)}</P>
            </View>
          )}
          <View style={styles.grand}>
            <P>Total</P>
            <P>{money(quote.totalMinor, currency)}</P>
          </View>
          {quote.depositPct > 0 && quote.depositPct < 100 && (
            <>
              <View style={[styles.totalRow, styles.split]}>
                <P>Deposit on acceptance ({quote.depositPct}%)</P>
                <P>{money(deposit, currency)}</P>
              </View>
              <View style={styles.totalRow}>
                <P>Balance on completion</P>
                <P>{money(balance, currency)}</P>
              </View>
            </>
          )}
        </View>

        {quote.paymentTerms && (
          <View wrap={false}>
            <P style={styles.h2}>Payment terms</P>
            <P>{quote.paymentTerms}</P>
          </View>
        )}

        {quote.terms && (
          <View>
            <P style={styles.h2}>Terms</P>
            <P>{quote.terms}</P>
          </View>
        )}

        {stamp && (
          <View style={styles.stamp} wrap={false}>
            <P style={styles.stampText}>{stamp}</P>
          </View>
        )}
        <View style={styles.footer} fixed>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `${company.name}  ·  ${quote.reference}  ·  page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderQuotePdf(
  quote: PublicQuote,
  company: { name: string; email: string; place: string },
): Promise<Buffer> {
  return renderToBuffer(<QuoteDocument quote={quote} company={company} />);
}
