"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Landmark, Lock } from "lucide-react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { useTableParams } from "@/components/dashboard/data-table/use-table-params";
import { useCan } from "@/components/dashboard/layout/staff-context";
import { StatusBadge, type StatusTone } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/dashboard/ui/button";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import type { Page } from "@/lib/pagination";
import { unmatchLine } from "../actions/bank";
import type { BankLineRow, BankLineStatus, BookingAccount } from "../types/bank";
import { BANK_LINE_STATUSES, BANK_LINE_TABLE } from "../rules/table";
import { BookDialog, IgnoreDialog, MatchDialog } from "./bank-line-dialogs";

const LABEL: Record<BankLineStatus, string> = {
  unmatched: "To check",
  matched: "Matched",
  ignored: "Set aside",
};
const TONE: Record<BankLineStatus, StatusTone> = {
  unmatched: "warning",
  matched: "success",
  ignored: "neutral",
};

type Active = { kind: "match" | "book" | "ignore"; line: BankLineRow } | null;

/** A bank account's statement lines, with what to do about each one. */
export function BankLinesTable({
  page,
  accounts,
}: {
  page: Page<BankLineRow>;
  accounts: BookingAccount[];
}) {
  const router = useRouter();
  const table = useTableParams(BANK_LINE_TABLE);
  const canReconcile = useCan("bank:reconcile");
  const { run, pending } = useServerAction();
  const [active, setActive] = useState<Active>(null);
  const close = () => setActive(null);

  const columns: Column<BankLineRow>[] = [
    {
      id: "date",
      header: "Date",
      sortable: true,
      cell: (line) => formatDate(line.date),
    },
    {
      id: "description",
      header: "Statement line",
      cell: (line) => (
        <div className="min-w-0">
          <p className="line-clamp-1 font-medium">{line.description}</p>
          <p className="text-muted-foreground line-clamp-1 text-xs">
            {line.status === "matched" && line.entryNumber ? (
              <>
                Matched to{" "}
                <Link
                  className="underline underline-offset-4"
                  href={`/dashboard/finance/journal/${line.entryId}`}
                >
                  {line.entryNumber}
                </Link>
              </>
            ) : line.status === "ignored" ? (
              (line.note ?? "Set aside")
            ) : (
              (line.reference ?? "")
            )}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      hideBelow: "md",
      cell: (line) => <StatusBadge tone={TONE[line.status]}>{LABEL[line.status]}</StatusBadge>,
    },
    {
      id: "amount",
      header: "Amount",
      sortable: true,
      align: "right",
      cell: (line) => (
        <span
          className={`tabular-nums ${line.amountMinor < 0 ? "" : "text-emerald-700 dark:text-emerald-400"}`}
        >
          {line.amountMinor > 0 ? "+" : "−"}
          {formatMinor(Math.abs(line.amountMinor))}
        </span>
      ),
    },
    {
      id: "actions",
      header: "What to do",
      cell: (line) => {
        if (line.locked)
          return (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <Lock className="size-3" aria-hidden="true" /> Signed off
            </span>
          );
        if (!canReconcile) return null;
        if (line.status === "unmatched")
          return (
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActive({ kind: "match", line })}
              >
                Match
              </Button>
              <Button size="sm" variant="outline" onClick={() => setActive({ kind: "book", line })}>
                Book
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setActive({ kind: "ignore", line })}>
                Set aside
              </Button>
            </div>
          );
        return (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              run(() => unmatchLine(line.id), {
                success: "Put back to check.",
                onSuccess: () => router.refresh(),
              })
            }
          >
            {line.status === "matched" ? "Undo match" : "Put back"}
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <ResourceTable
        table={table}
        page={page}
        columns={columns}
        getRowId={(line) => line.id}
        caption="Statement lines"
        searchLabel="Search statement lines"
        searchPlaceholder="Search the description or reference…"
        filters={[
          {
            id: "status",
            label: "Status",
            allLabel: "Any status",
            options: BANK_LINE_STATUSES.map((status) => ({ value: status, label: LABEL[status] })),
          },
        ]}
        emptyIcon={Landmark}
        emptyTitle="No statement lines"
        emptyDescription="Import a statement from your bank to start checking it against the books."
      />
      <MatchDialog line={active?.kind === "match" ? active.line : null} onClose={close} />
      <BookDialog
        line={active?.kind === "book" ? active.line : null}
        accounts={accounts}
        onClose={close}
      />
      <IgnoreDialog line={active?.kind === "ignore" ? active.line : null} onClose={close} />
    </>
  );
}
