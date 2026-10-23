import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { BackLink } from "@/components/dashboard/shared/back-link";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import { ReverseButton } from "@/features/finance/components/reverse-button";
import { getJournalEntry } from "@/features/finance/repository";
import { JOURNAL_SOURCE_LABEL } from "@/features/finance/table";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";

export const metadata: Metadata = { title: "Journal entry" };

export default async function JournalEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePageAccess("finance:view");
  if (!staff) return <AccessDenied area="the books" />;

  const { id } = await params;
  const entry = await getJournalEntry(id);
  if (!entry) notFound();

  const debit = entry.lines.reduce((sum, line) => sum + line.debitMinor, 0);
  const credit = entry.lines.reduce((sum, line) => sum + line.creditMinor, 0);
  const canReverse = can(staff, "finance:post") && !entry.reversedById && !entry.reversesId;

  return (
    <>
      <BackLink href="/dashboard/finance/journal">Journal</BackLink>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{entry.number}</h1>
            {entry.reversedById && <StatusBadge tone="neutral">Reversed</StatusBadge>}
            {entry.reversesId && <StatusBadge tone="info">Reversal</StatusBadge>}
          </div>
          <p className="text-muted-foreground text-sm">
            {formatDate(entry.entryDate)} ·{" "}
            {JOURNAL_SOURCE_LABEL[entry.sourceKind as keyof typeof JOURNAL_SOURCE_LABEL] ??
              entry.sourceKind}{" "}
            · posted by {entry.createdByName}
          </p>
        </div>
        {canReverse && <ReverseButton id={entry.id} number={entry.number} />}
      </div>

      <div className="grid gap-4">
        <Card>
          <CardContent className="grid gap-1">
            <p className="text-muted-foreground text-xs">What it is for</p>
            <p className="text-sm whitespace-pre-line">{entry.memo}</p>
            {entry.reversedById && (
              <p className="text-muted-foreground text-sm">
                Reversed by{" "}
                <Link
                  className="underline underline-offset-4"
                  href={`/dashboard/finance/journal/${entry.reversedById}`}
                >
                  {entry.reversedByNumber}
                </Link>
                .
              </p>
            )}
            {entry.reversesId && (
              <p className="text-muted-foreground text-sm">
                Undoes{" "}
                <Link
                  className="underline underline-offset-4"
                  href={`/dashboard/finance/journal/${entry.reversesId}`}
                >
                  {entry.reversesNumber}
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="text-muted-foreground hidden grid-cols-[1fr_9rem_9rem] gap-3 border-b px-4 py-2 text-xs font-medium tracking-wide uppercase sm:grid">
              <span>Account</span>
              <span className="text-right">Debit</span>
              <span className="text-right">Credit</span>
            </div>
            <ul className="divide-y">
              {entry.lines.map((line) => (
                <li
                  key={line.id}
                  className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1fr_9rem_9rem] sm:gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      <span className="text-muted-foreground mr-2 tabular-nums">
                        {line.accountCode}
                      </span>
                      {line.accountName}
                    </p>
                    {line.memo && <p className="text-muted-foreground text-xs">{line.memo}</p>}
                  </div>
                  <span className="tabular-nums sm:text-right">
                    {line.debitMinor > 0 ? formatMinor(line.debitMinor) : ""}
                  </span>
                  <span className="tabular-nums sm:text-right">
                    {line.creditMinor > 0 ? formatMinor(line.creditMinor) : ""}
                  </span>
                </li>
              ))}
            </ul>
            <div className="grid gap-1 border-t px-4 py-3 text-sm font-semibold sm:grid-cols-[1fr_9rem_9rem] sm:gap-3">
              <span>Total</span>
              <span className="tabular-nums sm:text-right">{formatMinor(debit)}</span>
              <span className="tabular-nums sm:text-right">{formatMinor(credit)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
