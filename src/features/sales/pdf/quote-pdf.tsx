import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import { quantityText } from "../pricing";
import type { PublicQuote } from "../types";

/**
 * The quote as a PDF. The built-in PDF fonts have no peso sign, so amounts read "PHP 12,500.00",
 * which is also how a bank or an accountant writes them.
 */
const money = (minor: number, currency: string) =>
  `${currency} ${(minor / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDay = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "UTC" }).format(
        new Date(`${value}T00:00:00Z`),
      )
    : "";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111111" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  muted: { color: "#555555" },
  right: { textAlign: "right" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  intro: { marginBottom: 14, lineHeight: 1.4 },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#111111",
    paddingBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cccccc",
    paddingVertical: 5,
  },
  colDescription: { width: "46%", paddingRight: 8 },
  colQty: { width: "14%", textAlign: "right" },
  colPrice: { width: "20%", textAlign: "right" },
  colTotal: { width: "20%", textAlign: "right" },
  totals: { marginTop: 10, alignSelf: "flex-end", width: "46%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#111111",
    marginTop: 4,
    paddingTop: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },
  section: { marginTop: 18 },
  sectionTitle: { fontFamily: "Helvetica-Bold", marginBottom: 3 },
  accepted: {
    marginTop: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: "#047857",
    color: "#047857",
  },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: "#777777" },
});

export function QuoteDocument({
  quote,
  company,
}: {
  quote: PublicQuote;
  company: { name: string; email: string; place: string };
}) {
  const { currency } = quote;
  return (
    <Document title={`${quote.reference} ${quote.title}`} author={company.name}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{company.name}</Text>
            <Text style={styles.muted}>{company.place}</Text>
            <Text style={styles.muted}>{company.email}</Text>
          </View>
          <View style={styles.right}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>
              Quote {quote.reference}
              {quote.version > 1 ? ` (version ${quote.version})` : ""}
            </Text>
            {quote.validUntil && (
              <Text style={styles.muted}>Valid until {formatDay(quote.validUntil)}</Text>
            )}
            <Text style={styles.muted}>Prepared for {quote.recipientName}</Text>
          </View>
        </View>

        <Text style={styles.title}>{quote.title}</Text>
        {quote.intro && <Text style={styles.intro}>{quote.intro}</Text>}

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
                <Text style={styles.muted}>{line.discountPct}% discount</Text>
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
        </View>

        {quote.terms && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terms</Text>
            <Text style={{ lineHeight: 1.4 }}>{quote.terms}</Text>
          </View>
        )}

        {quote.acceptedAt && (
          <View style={styles.accepted} wrap={false}>
            <Text>
              Accepted by {quote.acceptedByName} on {formatDay(quote.acceptedAt.slice(0, 10))}.
            </Text>
          </View>
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${company.name} · ${quote.reference} · page ${pageNumber} of ${totalPages}`
          }
          fixed
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
