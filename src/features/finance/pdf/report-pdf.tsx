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
import type { ReportRow, ReportSpec } from "../reports";

/**
 * Any report as a branded A4 document, drawn from the same description the screen and the CSV use.
 * The built-in PDF fonts have no peso sign, so amounts read "PHP 12,500.00".
 */
const INK = "#111111";
const MUTED = "#5f6368";
const LINE = "#dcdcdc";
const SOFT = "#f3f3f3";

const money = (minor: number) => {
  const text = `PHP ${(Math.abs(minor) / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return minor < 0 ? `-${text}` : text;
};

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
    marginBottom: 20,
  },
  brand: { flexDirection: "row", alignItems: "center" },
  mark: { width: 26, height: 30, marginRight: 9 },
  company: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    lineHeight: "18pt",
  },
  companyMeta: { fontSize: 9, color: MUTED, marginTop: 2, lineHeight: "12pt" },
  titleBlock: { alignItems: "flex-end" },
  title: { fontFamily: "Helvetica-Bold", fontSize: 20, lineHeight: "24pt" },
  subtitle: { fontSize: 10, color: MUTED, marginTop: 3, lineHeight: "14pt" },
  heading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: MUTED,
    marginTop: 14,
    marginBottom: 3,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: INK,
    lineHeight: "12pt",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
  },
  code: { width: 34, color: MUTED },
  label: { flex: 1, paddingRight: 8 },
  amount: { width: 100, textAlign: "right" },
  strong: { fontFamily: "Helvetica-Bold" },
  subtotal: { backgroundColor: SOFT },
  total: { borderTopWidth: 1, borderTopColor: INK, backgroundColor: SOFT, marginTop: 2 },
  note: { color: MUTED, fontSize: 9 },
  columnHead: {
    flexDirection: "row",
    color: MUTED,
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 4,
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

function P({ style, ...props }: TextProps & { children?: ReactNode }) {
  return (
    <Text
      {...props}
      style={[styles.text, ...(Array.isArray(style) ? style : style ? [style] : [])]}
    />
  );
}

function Row({ row, columns }: { row: ReportRow; columns: number }) {
  if (row.kind === "note")
    return (
      <View style={{ paddingVertical: 3 }} wrap={false}>
        <P style={styles.note}>{row.label}</P>
      </View>
    );
  const bold = row.kind === "subtotal" || row.kind === "total";
  return (
    <View
      style={[
        styles.row,
        row.kind === "subtotal" ? styles.subtotal : {},
        row.kind === "total" ? styles.total : {},
      ]}
      wrap={false}
    >
      {row.code ? <P style={styles.code}>{row.code}</P> : null}
      <P style={[styles.label, bold ? styles.strong : {}]}>{row.label}</P>
      {Array.from({ length: columns }, (_, index) => {
        const value = row.amounts?.[index];
        return (
          <P key={index} style={[styles.amount, bold ? styles.strong : {}]}>
            {value === null || value === undefined ? "" : money(value)}
          </P>
        );
      })}
    </View>
  );
}

export function ReportDocument({
  spec,
  company,
}: {
  spec: ReportSpec;
  company: { name: string; email: string; place: string };
}) {
  return (
    <Document title={`${spec.title}, ${spec.subtitle}`} author={company.name} subject={spec.title}>
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
            <P style={styles.title}>{spec.title}</P>
            <P style={styles.subtitle}>{spec.subtitle}</P>
          </View>
        </View>

        {spec.columns.length > 1 && (
          <View style={styles.columnHead}>
            <P style={{ flex: 1 }}> </P>
            {spec.columns.map((column) => (
              <P key={column} style={styles.amount}>
                {column}
              </P>
            ))}
          </View>
        )}
        {spec.sections.map((section, index) => (
          <View key={index}>
            {section.heading && (
              <P style={styles.heading} minPresenceAhead={40}>
                {section.heading}
              </P>
            )}
            {section.rows.map((row, at) => (
              <Row key={at} row={row} columns={spec.columns.length} />
            ))}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `${company.name}  ·  ${spec.title}  ·  page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderReportPdf(
  spec: ReportSpec,
  company: { name: string; email: string; place: string },
): Promise<Buffer> {
  return renderToBuffer(<ReportDocument spec={spec} company={company} />);
}
