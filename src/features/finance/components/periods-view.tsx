"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Lock, LockOpen } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import { closePeriod, reopenPeriod } from "../actions/books";
import { MONTH_NAMES, checkClose, checkReopen } from "../rules/core";
import type { PeriodView } from "../types/core";

/**
 * The twelve months of a fiscal year (January to December). A closed month takes no new postings:
 * that is how a finished month stays finished. Months close in order, and the latest closed month
 * can be reopened if something was missed.
 */
export function PeriodsView({ year, periods }: { year: number; periods: PeriodView[] }) {
  const router = useRouter();
  const canClose = useCan("finance:close");
  const { run, pending } = useServerAction();
  const statuses = periods.map((period) => period.status);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tabular-nums">Fiscal year {year}</h2>
        <div className="flex items-center gap-1" role="group" aria-label="Choose a year">
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Previous year"
            nativeButton={false}
            render={<Link href={`/dashboard/finance/periods?year=${year - 1}`} />}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Next year"
            nativeButton={false}
            render={<Link href={`/dashboard/finance/periods?year=${year + 1}`} />}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {periods.map((period) => {
              const closed = period.status === "closed";
              const reason = closed
                ? checkReopen(statuses, period.month)
                : checkClose(statuses, period.month);
              return (
                <li key={period.month} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {MONTH_NAMES[period.month - 1]}
                      <StatusBadge tone={closed ? "success" : "neutral"}>
                        {closed ? "Closed" : "Open"}
                      </StatusBadge>
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {period.entries} {period.entries === 1 ? "entry" : "entries"}
                      {closed &&
                        period.closedAt &&
                        ` · closed ${formatDate(period.closedAt)}${period.closedByName ? ` by ${period.closedByName}` : ""}`}
                    </p>
                  </div>
                  {canClose && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending || !!reason}
                      title={reason ?? undefined}
                      aria-label={`${closed ? "Reopen" : "Close"} ${MONTH_NAMES[period.month - 1]}${reason ? `: ${reason}` : ""}`}
                      onClick={() =>
                        run(
                          () =>
                            closed
                              ? reopenPeriod({ year, month: period.month })
                              : closePeriod({ year, month: period.month }),
                          {
                            success: closed ? "Month reopened." : "Month closed.",
                            onSuccess: () => router.refresh(),
                          },
                        )
                      }
                    >
                      {closed ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
                      {closed ? "Reopen" : "Close month"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
