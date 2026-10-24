import type { TableParamsConfig } from "@/lib/table-params";
import { CONTRACT_KINDS, CONTRACT_STATUSES } from "./core";

/** URL-driven state of the contracts list. Declared once so the page and the client table parse identically. */
export const CONTRACTS_TABLE: TableParamsConfig = {
  filters: { status: CONTRACT_STATUSES, kind: CONTRACT_KINDS },
  sortable: ["reference", "status", "created"],
  defaultSort: { sort: "created", dir: "desc" },
};
