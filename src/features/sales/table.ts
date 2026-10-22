import type { TableParamsConfig } from "@/lib/table-params";
import { QUOTE_STATUSES } from "./rules";

/** URL-driven state of the quotes list. Declared once so the page and the client table parse identically. */
export const QUOTES_TABLE: TableParamsConfig = {
  filters: { status: QUOTE_STATUSES },
  sortable: ["reference", "status", "total", "created"],
  defaultSort: { sort: "created", dir: "desc" },
};
