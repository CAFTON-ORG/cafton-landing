import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Hourglass, Percent, Target, Wallet } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Person } from "@/components/dashboard/shared/person";
import { StatCard } from "@/components/dashboard/shared/stat-card";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dashboard/ui/card";
import { Progress } from "@/components/dashboard/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/dashboard/ui/table";
import { monthOf, shiftMonth } from "@/features/sales/dashboard";
import { TargetDialog } from "@/features/sales/components/target-dialog";
import { getSalesOverview } from "@/features/sales/overview";
import { requirePageAccess } from "@/lib/auth/dal";
import { formatMinor } from "@/lib/money";

export const metadata: Metadata = { title: "Sales overview" };

const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );

export default async function SalesOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("deals:view");
  if (!staff) return <AccessDenied area="the sales overview" />;

  const raw = (await searchParams).month;
  const overview = await getSalesOverview(typeof raw === "string" ? raw : undefined);
  const month = overview.month.key;
  const label = monthLabel(month);
  const current = monthOf(new Date());
  const { decided, open, quotes } = overview;
  const money = (minor: number) => formatMinor(minor, "PHP", { compact: true });

  return (
    <>
      <PageHeader
        title="Sales overview"
        description="What is in the pipeline, how often deals are won, and how each person is doing against their goal."
        action={
          <nav aria-label="Month" className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              nativeButton={false}
              aria-label="Previous month"
              render={<Link href={`/dashboard/sales?month=${shiftMonth(month, -1)}`} />}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="min-w-36 text-center text-sm font-medium">{label}</span>
            <Button
              variant="outline"
              size="icon-sm"
              nativeButton={false}
              aria-label="Next month"
              render={<Link href={`/dashboard/sales?month=${shiftMonth(month, 1)}`} />}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
            {month !== current && (
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href="/dashboard/sales" />}
              >
                This month
              </Button>
            )}
          </nav>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open pipeline"
          value={money(open.valueMinor)}
          hint={`${open.count} open ${open.count === 1 ? "deal" : "deals"} · ${money(open.weightedMinor)} weighted`}
          icon={Wallet}
        />
        <StatCard
          label="Win rate"
          value={decided.winRatePct === null ? "—" : `${decided.winRatePct}%`}
          hint={
            decided.won + decided.lost === 0
              ? "No deals decided in the last 90 days"
              : `${decided.won} won, ${decided.lost} lost in the last 90 days`
          }
          icon={Percent}
        />
        <StatCard
          label="Sales cycle"
          value={decided.cycleDays === null ? "—" : `${decided.cycleDays} days`}
          hint="Average from new deal to won, last 90 days"
          icon={Hourglass}
        />
        <StatCard
          label={`Won in ${label}`}
          value={money(overview.month.wonMinor)}
          hint={
            overview.month.targetMinor > 0
              ? `${overview.month.attainmentPct ?? 0}% of ${money(overview.month.targetMinor)} goal`
              : `${overview.month.wonCount} ${overview.month.wonCount === 1 ? "deal" : "deals"} · no goal set`
          }
          icon={Target}
        />
      </div>

      <p className="text-muted-foreground mb-4 text-sm">
        {quotes.out} {quotes.out === 1 ? "quote" : "quotes"} worth {money(quotes.outMinor)} waiting
        for an answer · {money(quotes.acceptedMinor)} accepted in {label}
        {quotes.waitingForApproval > 0 && ` · ${quotes.waitingForApproval} waiting for approval`}.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>By person</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Open deals</TableHead>
                <TableHead className="hidden text-right md:table-cell">Pipeline</TableHead>
                <TableHead className="hidden text-right lg:table-cell">Weighted</TableHead>
                <TableHead className="text-right">Won in {label}</TableHead>
                <TableHead className="min-w-44">Goal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.owners.map((owner) => (
                <TableRow key={owner.ownerId ?? "unassigned"}>
                  <TableCell>
                    <Person name={owner.name} avatarUrl={owner.avatarUrl} fallback="Unassigned" />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{owner.openCount}</TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {money(owner.openMinor)}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-right tabular-nums lg:table-cell">
                    {money(owner.weightedMinor)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(owner.wonMinor)}</TableCell>
                  <TableCell>
                    {owner.ownerId === null ? (
                      <span className="text-muted-foreground text-sm">No goal for unassigned</span>
                    ) : owner.targetMinor ? (
                      <div className="grid gap-1">
                        <Progress
                          value={Math.min(100, owner.attainmentPct ?? 0)}
                          aria-label={`${owner.name}: ${owner.attainmentPct ?? 0}% of goal`}
                        />
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-muted-foreground tabular-nums">
                            {owner.attainmentPct}% of {money(owner.targetMinor)}
                          </span>
                          <TargetDialog
                            ownerId={owner.ownerId}
                            name={owner.name}
                            month={month}
                            monthLabel={label}
                            targetMinor={owner.targetMinor}
                          />
                        </div>
                      </div>
                    ) : (
                      <TargetDialog
                        ownerId={owner.ownerId}
                        name={owner.name}
                        month={month}
                        monthLabel={label}
                        targetMinor={null}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
