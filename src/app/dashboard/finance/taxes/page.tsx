import type { Metadata } from "next";
import Link from "next/link";
import { Coins, Receipt, Scale, WalletCards } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { StatCard } from "@/components/dashboard/shared/stat-card";
import { Button } from "@/components/dashboard/ui/button";
import { Card, CardContent } from "@/components/dashboard/ui/card";
import { TaxTrackerView } from "@/features/finance/components/tax-tracker-view";
import { listPostableAccounts } from "@/features/finance/repository/ledger";
import {
  ANNUAL_ALLOWANCE_MINOR,
  EIGHT_PERCENT_RATE_BP,
  estimateTax,
} from "@/features/finance/rules/tax";
import { getTracker } from "@/features/finance/repository/tax";
import { manilaDate } from "@/features/schedule/rules/slots";
import { requirePageAccess } from "@/lib/auth/dal";
import { formatMinor } from "@/lib/money";
import { searchParamsFromRecord } from "@/lib/table-params";

export const metadata: Metadata = { title: "Income tax" };

export default async function TaxesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("finance:view");
  if (!staff) return <AccessDenied area="the tax tracker" />;

  const today = manilaDate(new Date());
  const thisYear = Number(today.slice(0, 4));
  const asked = Number(searchParamsFromRecord(await searchParams).get("year"));
  const year =
    Number.isInteger(asked) && asked >= thisYear - 5 && asked <= thisYear ? asked : thisYear;

  const [tracker, accounts] = await Promise.all([getTracker(year, today), listPostableAccounts()]);
  if (!tracker) return null;

  // What the year so far comes to, whatever return it falls in.
  const sofar = estimateTax({
    grossToDateMinor: tracker.grossToDateMinor,
    settledBeforeMinor: 0,
    cwtAvailableMinor: 0,
  });
  const left = Math.max(0, ANNUAL_ALLOWANCE_MINOR - tracker.grossToDateMinor);

  return (
    <>
      <PageHeader
        title="Income tax"
        description="The business is on the 8% income tax option: 8% of gross receipts above 250,000 pesos a year, filed quarterly (1701Q) and once a year (1701A). Figures are estimates from the books, for your accountant to confirm."
        action={
          <div className="flex gap-2">
            {[thisYear, thisYear - 1].map((value) => (
              <Button
                key={value}
                variant={value === year ? "default" : "outline"}
                nativeButton={false}
                render={<Link href={`/dashboard/finance/taxes?year=${value}`} />}
              >
                {value}
              </Button>
            ))}
          </div>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          label={`Gross receipts in ${year}`}
          value={formatMinor(tracker.grossToDateMinor)}
          icon={Coins}
          hint="Income the books recognised"
        />
        <StatCard
          label="Left before tax starts"
          value={formatMinor(left)}
          icon={Scale}
          hint={`of the ${formatMinor(ANNUAL_ALLOWANCE_MINOR, "PHP", { compact: true })} allowance`}
        />
        <StatCard
          label="Tax for the year so far"
          value={formatMinor(sofar.taxToDateMinor)}
          icon={Receipt}
          hint={`${EIGHT_PERCENT_RATE_BP / 100}% of ${formatMinor(sofar.taxableMinor)}`}
        />
        <StatCard
          label="Already settled"
          value={formatMinor(tracker.settledMinor)}
          icon={WalletCards}
          hint="Cash and withheld tax, in recorded returns"
        />
      </div>

      <TaxTrackerView
        year={year}
        today={today}
        items={tracker.obligations}
        accounts={accounts
          .filter((account) => account.type === "asset")
          .map((account) => ({
            id: account.id,
            code: account.code,
            name: account.name,
            systemKey: account.systemKey,
          }))}
      />

      <Card className="mt-4">
        <CardContent className="text-muted-foreground text-xs">
          How it is worked out: gross receipts are the income accounts in the books (what has been
          invoiced or otherwise recognised, not only what has been paid). Each quarterly return
          works on the year so far, taking off what the earlier returns settled and the tax clients
          withheld (form 2307). This tracker doesn&apos;t file anything with the BIR. It is for
          planning and for keeping a record of what was filed and paid.
        </CardContent>
      </Card>
    </>
  );
}
