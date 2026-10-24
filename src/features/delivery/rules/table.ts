import type { TableParamsConfig } from "@/lib/table-params";
import { PROJECT_STATUSES } from "./core";

/** URL-driven state of the projects list. Declared once so the page and the client table parse identically. */
export const PROJECTS_TABLE: TableParamsConfig = {
  filters: { status: PROJECT_STATUSES, manager: ["me", "none"] },
  sortable: ["name", "status", "due", "created"],
  defaultSort: { sort: "created", dir: "desc" },
};
