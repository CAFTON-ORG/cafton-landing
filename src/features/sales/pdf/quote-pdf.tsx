import {
  Document,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import { LOGO_PATH_D } from "@/components/shared/logo";
import { quantityText } from "../pricing";
import { QUOTE_STATUS_LABEL } from "../rules";
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
    lineHeight: 1.45,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  brand: { flexDirection: "row", alignItems: "center" },
  mark: { width: 30, height: 35, marginRight: 10 },
  company: { fontFamily: "Helvetica-Bold", fontSize: 16, letterSpacing: 1.5 },
  companyMeta: { fontSize: 9, color: MUTED, marginTop: 2 },
  titleBlock: { alignItems: "flex-end" },
  title: { fontFamily: "Helvetica-Bold", fontSize: 22 },
  number: { fontSize: 11, marginTop: 4 },
  status: { fontSize: 9, color: MUTED, marginTop: 2 },
  meta: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: LINE,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 10,
    marginBottom: 18,
  },
  metaCol: { flex: 1, paddingRight: 10 },
  label: {
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  strong: { fontFamily: "Helvetica-Bold" },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 12, marginTop: 16, marginBottom: 5 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: INK,
    color: "#ffffff",
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
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
  },
  stamp: {
    marginTop: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: INK,
    borderRadius: 4,
    fontFamily: "Helvetica-Bold",
  },
  footer: { position: "absolute", bottom: 22, left: 44, right: 44, fontSize: 8, color: MUTED },
});

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
              <Text style={styles.company}>{company.name}</Text>
              <Text style={styles.companyMeta}>
                {[company.email, company.place].filter(Boolean).join("  ·  ")}
              </Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Quotation</Text>
            <Text style={styles.number}>
              {quote.reference}
              {quote.version > 1 ? `  ·  version ${quote.version}` : ""}
            </Text>
            <Text style={styles.status}>{QUOTE_STATUS_LABEL[quote.status]}</Text>
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaCol}>
            <Text style={styles.label}>Prepared for</Text>
            <Text style={styles.strong}>{quote.recipientName}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.label}>Project</Text>
            <Text style={styles.strong}>{quote.title}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.label}>Issued</Text>
            <Text>{formatDay(quote.issuedOn) || "—"}</Text>
            <Text style={[styles.label, { marginTop: 6 }]}>Valid until</Text>
            <Text>{formatDay(quote.validUntil) || "—"}</Text>
          </View>
        </View>

        {quote.intro && <Text style={{ marginBottom: 14 }}>{quote.intro}</Text>}

        <View style={styles.tableHead}>
          <Text style={styles.colDescription}>Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colPrice}>Unit price</Text>
          <Text style={styles.colTotal}>Amount</Text>
        </View>
        {quote.lines.map((line, index) => (
          <View key={index} style={styles.row} wrap={false}>
            <View style={styles.colDescription}>
              <Text>{line.description}</Text>
              {line.discountPct > 0 && (
                <Text style={{ color: MUTED }}>{line.discountPct}% discount</Text>
              )}
            </View>
            <Text style={styles.colQty}>
              {quantityText(line.quantityMilli)} {line.unitLabel}
            </Text>
            <Text style={styles.colPrice}>{money(line.unitPriceMinor, currency)}</Text>
            <Text style={styles.colTotal}>{money(line.totalMinor, currency)}</Text>
          </View>
        ))}

        <View style={styles.totals} wrap={false}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{money(quote.subtotalMinor, currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>VAT ({quote.taxRatePct}%)</Text>
            <Text>{money(quote.taxMinor, currency)}</Text>
          </View>
          <View style={styles.grand}>
            <Text>Total</Text>
            <Text>{money(quote.totalMinor, currency)}</Text>
          </View>
          {quote.depositPct > 0 && quote.depositPct < 100 && (
            <>
              <View style={[styles.totalRow, { marginTop: 6 }]}>
                <Text>Deposit on acceptance ({quote.depositPct}%)</Text>
                <Text>{money(deposit, currency)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text>Balance on completion</Text>
                <Text>{money(balance, currency)}</Text>
              </View>
            </>
          )}
        </View>

        {quote.paymentTerms && (
          <View wrap={false}>
            <Text style={styles.h2}>Payment terms</Text>
            <Text>{quote.paymentTerms}</Text>
          </View>
        )}

        {quote.terms && (
          <View>
            <Text style={styles.h2}>Terms</Text>
            <Text>{quote.terms}</Text>
          </View>
        )}

        {stamp && (
          <Text style={styles.stamp} wrap={false}>
            {stamp}
          </Text>
        )}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${company.name}  ·  ${quote.reference}  ·  page ${pageNumber} of ${totalPages}`
          }
        />
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
