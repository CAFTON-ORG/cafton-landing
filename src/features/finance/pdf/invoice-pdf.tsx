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
import { quantityText } from "@/features/sales/pricing";
import type { InvoiceDetail } from "../invoice-types";
import { INVOICE_STATE_LABEL } from "../invoicing";

/**
 * The invoice as a branded A4 document, drawn the way the quote is: the built-in PDF fonts have no
 * peso sign, so amounts read "PHP 12,500.00", and the logo comes from its vector path.
 */
const INK = "#111111";
const MUTED = "#5f6368";
const LINE = "#dcdcdc";
const SOFT = "#f3f3f3";

const money = (minor: number) =>
  `PHP ${(minor / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

/** Body text with the document's line height, set per text: a page-level one hides the footer. */
function P({ style, ...props }: TextProps & { children?: ReactNode }) {
  return (
    <Text
      {...props}
      style={[styles.text, ...(Array.isArray(style) ? style : style ? [style] : [])]}
    />
  );
}

export function InvoiceDocument({
  invoice,
  company,
}: {
  invoice: InvoiceDetail;
  company: { name: string; email: string; place: string };
}) {
  const reference = invoice.number ?? "Draft";
  return (
    <Document title={`Invoice ${reference}`} author={company.name} subject={invoice.clientName}>
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
            <P style={styles.title}>Invoice</P>
            <P style={styles.number}>{reference}</P>
            {(invoice.state === "paid" || invoice.state === "void") && (
              <P style={styles.status}>{INVOICE_STATE_LABEL[invoice.state]}</P>
            )}
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaColWide}>
            <P style={styles.label}>Billed to</P>
            <P style={styles.strong}>{invoice.clientName}</P>
            {invoice.clientAddress && <P>{invoice.clientAddress}</P>}
            {invoice.clientTin && <P>TIN {invoice.clientTin}</P>}
          </View>
          <View style={styles.metaCol}>
            <P style={styles.label}>Issued</P>
            <P>{formatDay(invoice.issueDate) || "—"}</P>
          </View>
          <View style={styles.metaCol}>
            <P style={styles.label}>Due</P>
            <P>{formatDay(invoice.dueDate) || "—"}</P>
          </View>
        </View>

        <View style={styles.tableHead} fixed minPresenceAhead={60}>
          <P style={styles.colDescription}>Description</P>
          <P style={styles.colQty}>Qty</P>
          <P style={styles.colPrice}>Unit price</P>
          <P style={styles.colTotal}>Amount</P>
        </View>
        {invoice.lines.map((line) => (
          <View key={line.id} style={styles.row} wrap={false}>
            <View style={styles.colDescription}>
              <P>{line.description}</P>
            </View>
            <P style={styles.colQty}>
              {quantityText(line.quantityMilli)} {line.unitLabel}
            </P>
            <P style={styles.colPrice}>{money(line.unitPriceMinor)}</P>
            <P style={styles.colTotal}>{money(line.amountMinor)}</P>
          </View>
        ))}

        <View style={styles.totals} wrap={false}>
          <View style={styles.totalRow}>
            <P>Subtotal</P>
            <P>{money(invoice.subtotalMinor)}</P>
          </View>
          {invoice.taxMinor > 0 && (
            <View style={styles.totalRow}>
              <P>VAT ({invoice.taxRateBp / 100}%)</P>
              <P>{money(invoice.taxMinor)}</P>
            </View>
          )}
          <View style={styles.grand}>
            <P>Total</P>
            <P>{money(invoice.totalMinor)}</P>
          </View>
          {invoice.settledMinor + invoice.creditedMinor > 0 && (
            <>
              {invoice.creditedMinor > 0 && (
                <View style={styles.totalRow}>
                  <P>Credited</P>
                  <P>{money(invoice.creditedMinor)}</P>
                </View>
              )}
              {invoice.settledMinor > 0 && (
                <View style={styles.totalRow}>
                  <P>Paid</P>
                  <P>{money(invoice.settledMinor)}</P>
                </View>
              )}
              <View style={styles.totalRow}>
                <P style={styles.strong}>Amount due</P>
                <P style={styles.strong}>{money(invoice.balanceMinor)}</P>
              </View>
            </>
          )}
        </View>

        {invoice.paymentInstructions && (
          <View wrap={false}>
            <P style={styles.h2}>How to pay</P>
            <P>{invoice.paymentInstructions}</P>
          </View>
        )}
        {invoice.notes && (
          <View>
            <P style={styles.h2}>Notes</P>
            <P>{invoice.notes}</P>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `${company.name}  ·  ${reference}  ·  page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(
  invoice: InvoiceDetail,
  company: { name: string; email: string; place: string },
): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} company={company} />);
}
