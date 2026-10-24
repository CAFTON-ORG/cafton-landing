import "server-only";

import { recordAudit } from "@/lib/audit";
import { can, type Staff } from "@/lib/auth/dal";
import { actorId } from "@/lib/actions";
import { toCsv } from "@/lib/csv";
import { parseTableParams, type TableParams } from "@/lib/table-params";
import { csvCustomValue, type CustomEntity, type CustomValues } from "../rules/custom-fields";
import { listCustomFields } from "../repository/custom-fields";
import { listContacts } from "../repository/contacts";
import { listDeals } from "../repository/deals";
import { listLeads } from "../repository/leads";
import { listOrganizations } from "../repository/organizations";
import { listPipelines } from "../repository/pipeline";
import { CONTACTS_TABLE, LEADS_TABLE, ORGANIZATIONS_TABLE, dealsTableConfig } from "../table";

export const EXPORT_KINDS = ["leads", "contacts", "organizations", "deals"] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

/** A single export is capped so one click can't pull the whole database through a request. */
const LIMIT = 5000;
const everything = (params: TableParams): TableParams => ({ ...params, page: 1, pageSize: LIMIT });

const money = (minor: number | null | undefined) =>
  minor === null || minor === undefined ? "" : (minor / 100).toFixed(2);

/** The rows of a list as CSV, honouring the same search and filters the screen had. */
export async function exportCsv(
  kind: ExportKind,
  query: URLSearchParams,
  staff: Staff,
): Promise<{ filename: string; body: string; count: number }> {
  const me = actorId(staff);
  let headers: string[];
  let rows: unknown[][];
  let customs: CustomValues[];
  const entity: CustomEntity =
    kind === "leads"
      ? "lead"
      : kind === "contacts"
        ? "contact"
        : kind === "organizations"
          ? "organization"
          : "deal";

  if (kind === "leads") {
    const page = await listLeads(everything(parseTableParams(query, LEADS_TABLE)), me);
    headers = [
      "Reference",
      "Name",
      "Email",
      "Phone",
      "Business",
      "Interested in",
      "Budget",
      "Timeline",
      "Status",
      "Owner",
      "Source",
      "Received",
    ];
    customs = page.items.map((item) => item.custom);
    rows = page.items.map((l) => [
      l.reference,
      l.name,
      l.email,
      l.phone,
      l.businessName,
      l.goalsArea,
      l.budget,
      l.timeline,
      l.status,
      l.ownerName,
      l.source,
      l.createdAt,
    ]);
  } else if (kind === "contacts") {
    const page = await listContacts(everything(parseTableParams(query, CONTACTS_TABLE)));
    headers = [
      "Name",
      "Email",
      "Phone",
      "Position",
      "Organization",
      "Owner",
      "Source",
      "Deals",
      "Added",
    ];
    customs = page.items.map((item) => item.custom);
    rows = page.items.map((c) => [
      c.name,
      c.email,
      c.phone,
      c.position,
      c.organizationName,
      c.ownerName,
      c.source,
      c.dealCount,
      c.createdAt,
    ]);
  } else if (kind === "organizations") {
    const page = await listOrganizations(everything(parseTableParams(query, ORGANIZATIONS_TABLE)));
    headers = ["Name", "Industry", "Size", "Website", "Phone", "Address", "Contacts", "Added"];
    customs = page.items.map((item) => item.custom);
    rows = page.items.map((o) => [
      o.name,
      o.industry,
      o.size,
      o.website,
      o.phone,
      o.address,
      o.contactCount,
      o.createdAt,
    ]);
  } else {
    const stages = (await listPipelines()).flatMap((pipeline) => pipeline.stages);
    const page = await listDeals(
      everything(parseTableParams(query, dealsTableConfig(stages.map((s) => s.key)))),
      me,
    );
    headers = [
      "Reference",
      "Deal",
      "Contact",
      "Organization",
      "Stage",
      "Probability %",
      "Value",
      "Currency",
      "Owner",
      "Expected close",
      "Source",
      "Lost reason",
      "Created",
    ];
    customs = page.items.map((item) => item.custom);
    rows = page.items.map((d) => [
      d.reference,
      d.title,
      d.contactName,
      d.organizationName,
      d.stageName,
      d.probability,
      money(d.amountMinor),
      d.currency,
      d.ownerName,
      d.expectedCloseDate,
      d.source,
      d.lostReason,
      d.createdAt,
    ]);
  }

  // Every active custom field is a column of its own, after the standard ones.
  const fields = await listCustomFields(entity);
  headers = [...headers, ...fields.map((field) => field.label)];
  rows = rows.map((row, index) => [
    ...row,
    ...fields.map((field) => csvCustomValue(field, customs[index]?.[field.key])),
  ]);

  await recordAudit(staff, {
    action: "crm.export",
    entity: kind,
    summary: `Exported ${rows.length} ${kind} to CSV`,
  });
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    filename: `cafton-${kind}-${stamp}.csv`,
    body: toCsv(headers, rows),
    count: rows.length,
  };
}

/** Exporting hands out personal data, so it needs the right to see the list and to edit it. */
export const exportPermission = (kind: ExportKind) =>
  (kind === "organizations" ? "organizations:update" : `${kind}:update`) as
    "leads:update" | "contacts:update" | "organizations:update" | "deals:update";

export const canExport = (staff: Pick<Staff, "permissions">, kind: ExportKind) =>
  can(staff, exportPermission(kind));
