import "server-only";

import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * The next number of a gapless series ("INV-2026-0001"). Taken inside the transaction that uses it:
 * if that transaction rolls back, the number goes back too, so there are no holes (the tax
 * authority expects invoice numbers without them). The update locks the row, so two people issuing
 * at once take turns.
 */
export async function nextDocumentNumber(
  tx: Tx,
  prefix: "INV" | "CN" | "RCT" | "BILL" | "BPAY" | "EXP",
  year: number,
): Promise<string> {
  const key = `${prefix}:${year}`;
  const rows = await tx.$queryRaw<{ last_number: number }[]>`
    INSERT INTO document_counters (key, last_number) VALUES (${key}, 1)
    ON CONFLICT (key) DO UPDATE SET last_number = document_counters.last_number + 1
    RETURNING last_number`;
  return `${prefix}-${year}-${String(rows[0].last_number).padStart(4, "0")}`;
}
