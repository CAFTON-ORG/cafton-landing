import { LEAD_BANDS } from "./scoring";
import type { TableParamsConfig } from "@/lib/table-params";
import { CUSTOM_FILTER_PREFIX } from "./custom-fields";
import { LEAD_STATUSES } from "./types";

/** URL-driven state for each CRM list. Declared once so the page and the client table parse identically. */

export const LEADS_TABLE: TableParamsConfig = {
  filters: { status: LEAD_STATUSES, owner: ["me", "unassigned"], band: LEAD_BANDS },
  free: ["tag"],
  prefixed: CUSTOM_FILTER_PREFIX,
  sortable: ["name", "status", "score", "created"],
  defaultSort: { sort: "created", dir: "desc" },
};

export const CONTACTS_TABLE: TableParamsConfig = {
  free: ["tag"],
  prefixed: CUSTOM_FILTER_PREFIX,
  sortable: ["name", "organization", "created"],
  defaultSort: { sort: "name", dir: "asc" },
};

export const ORGANIZATIONS_TABLE: TableParamsConfig = {
  free: ["tag"],
  prefixed: CUSTOM_FILTER_PREFIX,
  sortable: ["name", "created"],
  defaultSort: { sort: "name", dir: "asc" },
};

/** Stage keys are data, so the caller supplies them. */
export function dealsTableConfig(stageKeys: readonly string[]): TableParamsConfig {
  return {
    filters: { stage: stageKeys, owner: ["me", "unassigned"] },
    free: ["tag", "pipeline"],
    prefixed: CUSTOM_FILTER_PREFIX,
    sortable: ["title", "stage", "amount", "close", "created"],
    defaultSort: { sort: "created", dir: "desc" },
  };
}
