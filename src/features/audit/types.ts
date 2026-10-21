export interface AuditRow {
  id: string;
  /** ISO timestamp. */
  at: string;
  actor: string;
  action: string;
  entity: string;
  summary: string;
}

/** Entity types that appear in the log; grows as modules arrive. */
export const AUDIT_ENTITIES = ["user", "role"] as const;
