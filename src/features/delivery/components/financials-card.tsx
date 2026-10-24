import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { formatMinor } from "@/lib/money";
import { cn } from "@/lib/utils";
import { formatMinutes, margin } from "../rules/core";
import type { ProjectFinancials } from "../types/core";

/**
 * What the project earns against what it costs. Only approved hours count, valued at each member's
 * hourly cost, so the figures are firm; hours with no cost rate are named rather than guessed.
 */
export function FinancialsCard({ financials }: { financials: ProjectFinancials }) {
  const { currency } = financials;
  const kept = margin(financials.priceMinor ?? null, financials.costMinor);
  const fact = (label: string, value: string, tone?: "bad") => (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        className={cn("text-lg font-semibold tabular-nums", tone === "bad" && "text-destructive")}
      >
        {value}
      </dd>
    </div>
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Price and cost</CardTitle>
        <CardDescription>
          From approved hours only. Hours still waiting for approval are not counted yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {fact(
            "Price",
            financials.priceMinor === undefined
              ? "Not set"
              : formatMinor(financials.priceMinor, currency),
          )}
          {fact("Cost so far", formatMinor(financials.costMinor, currency))}
          {fact(
            "Margin",
            kept
              ? `${formatMinor(kept.amountMinor, currency)}${kept.percent === null ? "" : ` (${kept.percent}%)`}`
              : "Needs a price",
            kept && kept.amountMinor < 0 ? "bad" : undefined,
          )}
          {fact(
            "Approved hours",
            `${formatMinutes(financials.approvedMinutes)}${
              financials.billableMinutes < financials.approvedMinutes
                ? ` · ${formatMinutes(financials.billableMinutes)} billable`
                : ""
            }`,
          )}
        </dl>
        {financials.unratedMinutes > 0 && (
          <p className="text-muted-foreground text-xs">
            {formatMinutes(financials.unratedMinutes)} was worked by people with no hourly cost set,
            so the cost above is lower than it really is. Set their cost on the Team tab.
          </p>
        )}
        {financials.billableMilestonesMinor > 0 && (
          <p className="text-muted-foreground text-xs">
            Milestones will invoice {formatMinor(financials.billableMilestonesMinor, currency)};{" "}
            {formatMinor(financials.earnedMilestonesMinor, currency)} of that is earned (done).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
