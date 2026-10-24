import Link from "next/link";
import { Gauge } from "lucide-react";

import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { Person } from "@/components/dashboard/shared/person";
import { Button } from "@/components/dashboard/ui/button";
import {
  CardAction,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { Progress } from "@/components/dashboard/ui/progress";
import { REPORT_WEEKS, WORK_WEEK_MINUTES, formatMinutes } from "../rules/core";
import type { UtilisationRow } from "../types/core";

/**
 * Who is spending their time on billable work. Utilisation is billable approved hours as a share
 * of a 40-hour week; hours not approved yet are shown beside it, not counted.
 */
export function UtilisationReport({ rows, weeks }: { rows: UtilisationRow[]; weeks: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Utilisation</CardTitle>
        <CardDescription>
          Billable approved hours out of {formatMinutes(weeks * WORK_WEEK_MINUTES)} available over
          the last {weeks === 1 ? "week" : `${weeks} weeks`}.
        </CardDescription>
        <CardAction stackOnPhone className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex gap-1" role="group" aria-label="Report range">
            {REPORT_WEEKS.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={option === weeks ? "secondary" : "ghost"}
                aria-current={option === weeks ? "true" : undefined}
                nativeButton={false}
                render={<Link href={`/dashboard/time?tab=utilisation&weeks=${option}`} />}
              >
                {option === 1 ? "This week" : `${option} weeks`}
              </Button>
            ))}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={Gauge}
            title="No hours in this period"
            description="Once people submit and get their time approved, their utilisation shows here."
          />
        ) : (
          <ul className="divide-y rounded-lg border">
            {rows.map((row) => (
              <li key={row.person.id} className="flex flex-wrap items-center gap-4 p-3">
                <div className="w-48 shrink-0">
                  <Person name={row.person.name} avatarUrl={row.person.avatarUrl} />
                </div>
                <div className="grid min-w-40 flex-1 gap-1">
                  <Progress
                    value={Math.min(row.percent, 100)}
                    aria-label={`${row.person.name}: ${row.percent}% utilised`}
                  />
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {formatMinutes(row.billableMinutes)} billable of{" "}
                    {formatMinutes(row.approvedMinutes)} approved
                    {row.pendingMinutes > 0 &&
                      ` · ${formatMinutes(row.pendingMinutes)} not approved yet`}
                  </p>
                </div>
                <span className="w-14 text-right text-lg font-semibold tabular-nums">
                  {row.percent}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
