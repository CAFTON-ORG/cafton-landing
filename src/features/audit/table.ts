import type { TableParamsConfig } from "@/lib/table-params";
import { AUDIT_ENTITIES } from "./types";

/** The log is always ordered by time; only the direction is selectable. */
export const AUDIT_TABLE: TableParamsConfig = {
  filters: { entity: AUDIT_ENTITIES },
  sortable: ["when"],
  defaultSort: { sort: "when", dir: "desc" },
};
