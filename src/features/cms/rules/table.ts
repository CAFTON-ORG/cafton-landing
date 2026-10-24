import type { TableParamsConfig } from "@/lib/table-params";
import { CONTENT_STATUSES } from "../types/admin";

/** URL-driven state for every content list: search, status filter, sort. */
export const CONTENT_TABLE: TableParamsConfig = {
  filters: { status: CONTENT_STATUSES },
  sortable: ["title", "date", "updated"],
  defaultSort: { sort: "updated", dir: "desc" },
};
