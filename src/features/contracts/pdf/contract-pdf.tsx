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
import { contractBlocks } from "../rules/format";
import { CONTRACT_KIND_LABEL, CONTRACT_STATUS_LABEL } from "../rules/core";
import type { PublicContract } from "../types";

/** A contract or statement of work as a branded A4 document, with the same vector logo as quotes. */
const INK = "#111111";
const MUTED = "#5f6368";
const LINE = "#dcdcdc";

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
    lineHeight: 1.5,
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
  kind: { fontFamily: "Helvetica-Bold", fontSize: 18 },
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
  title: { fontFamily: "Helvetica-Bold", fontSize: 14, marginBottom: 10 },
  paragraph: { marginBottom: 8 },
  heading: { fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 10, marginBottom: 4 },
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

export function ContractDocument({
  contract,
  company,
}: {
  contract: PublicContract;
  company: { name: string; email: string; place: string };
}) {
  const stamp =
    contract.status === "accepted"
      ? `Signed by ${contract.acceptedByName} on ${formatDay(contract.acceptedAt)}. This is a record of what was agreed.`
      : contract.status === "declined"
        ? "This contract was declined."
        : contract.status === "withdrawn"
          ? "This contract was withdrawn and is no longer open."
          : contract.status === "expired"
            ? `This contract expired on ${formatDay(contract.validUntil)}.`
            : null;

  return (
    <Document
      title={`${contract.reference} ${contract.title}`}
      author={company.name}
      subject={contract.title}
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
            <Text style={styles.kind}>{CONTRACT_KIND_LABEL[contract.kind]}</Text>
            <Text style={styles.number}>{contract.reference}</Text>
            <Text style={styles.status}>{CONTRACT_STATUS_LABEL[contract.status]}</Text>
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaCol}>
            <Text style={styles.label}>Prepared for</Text>
            <Text style={styles.strong}>{contract.recipientName}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.label}>Issued</Text>
            <Text>{formatDay(contract.issuedOn) || "—"}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.label}>Sign by</Text>
            <Text>{formatDay(contract.validUntil) || "—"}</Text>
          </View>
        </View>

        <Text style={styles.title}>{contract.title}</Text>
        {contractBlocks(contract.body).map((block, index) => (
          <Text key={index} style={block.kind === "heading" ? styles.heading : styles.paragraph}>
            {block.text}
          </Text>
        ))}

        {stamp && (
          <Text style={styles.stamp} wrap={false}>
            {stamp}
          </Text>
        )}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${company.name}  ·  ${contract.reference}  ·  page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

export async function renderContractPdf(
  contract: PublicContract,
  company: { name: string; email: string; place: string },
): Promise<Buffer> {
  return renderToBuffer(<ContractDocument contract={contract} company={company} />);
}
