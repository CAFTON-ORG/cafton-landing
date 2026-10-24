import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CircleCheck,
  FileText,
  Hourglass,
  Landmark,
  Receipt,
  Scale,
  TrendingUp,
  Upload,
  WalletCards,
} from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { StatCard } from "@/components/dashboard/shared/stat-card";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { IncomeExpenseChart } from "@/features/finance/components/income-expense-chart";
import { countAwaitingApproval } from "@/features/finance/repository/expenses";
import { invoiceSummary } from "@/features/finance/repository/invoices";
import {
  bankLinesToCheck,
  cashPosition,
  monthlyBars,
  profitBetween,
} from "@/features/finance/repository/overview";
import { billSummary } from "@/features/finance/repository/payables";
import { getTracker, isLiveYear } from "@/features/finance/repository/tax";
import { manilaDate } from "@/features/schedule/rules/slots";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { formatMinor } from "@/lib/money";

export const metadata: Metadata = { title: "Finance" };

interface Attention {
  text: string;
  detail?: string;
  href: string;
  tone: "danger" | "warning" | "neutral";
}

const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

export default async function FinanceOverviewPage() {
  const staff = await requirePageAccess("finance:view");
  if (!staff) return <AccessDenied area="finance" />;

  const today = manilaDate(new Date());
  const year = Number(today.slice(0, 4));
  const monthStart = `${today.slice(0, 7)}-01`;
  const [cash, invoices, bills, month, yearToDate, bars, waiting, bankLines, tracker, lastYear] =
    await Promise.all([
      cashPosition(),
      invoiceSummary(today),
      billSummary(today),
      profitBetween(monthStart, today),
      profitBetween(`${year}-01-01`, today),
      monthlyBars(today, 6),
      can(staff, "expenses:approve") ? countAwaitingApproval() : 0,
      can(staff, "bank:view") ? bankLinesToCheck() : 0,
      getTracker(year, today),
      getTracker(year - 1, today),
    ]);

  const attention: Attention[] = [];
  if (invoices.overdue.count > 0)
    attention.push({
      text: `${plural(invoices.overdue.count, "invoice")} overdue`,
      detail: `${formatMinor(invoices.overdue.amountMinor)} to collect`,
      href: "/dashboard/finance/invoices?state=overdue",
      tone: "danger",
    });
  if (bills.overdue.count > 0)
    attention.push({
      text: `${plural(bills.overdue.count, "bill")} overdue`,
      detail: `${formatMinor(bills.overdue.amountMinor)} to pay`,
      href: "/dashboard/finance/bills?state=overdue",
      tone: "danger",
    });
  if (bills.dueSoon.count > 0)
    attention.push({
      text: `${plural(bills.dueSoon.count, "bill")} due in the next 7 days`,
      detail: `${formatMinor(bills.dueSoon.amountMinor)}`,
      href: "/dashboard/finance/bills?state=awaiting",
      tone: "warning",
    });
  if (waiting > 0)
    attention.push({
      text: `${plural(waiting, "expense")} waiting for your approval`,
      href: "/dashboard/finance/expenses?status=submitted",
      tone: "warning",
    });
  if (bills.draft.count > 0)
    attention.push({
      text: `${plural(bills.draft.count, "draft bill")} to check`,
      detail: "Including any made by recurring items",
      href: "/dashboard/finance/bills?state=draft",
      tone: "neutral",
    });
  if (bankLines > 0)
    attention.push({
      text: `${plural(bankLines, "bank line")} to match or book`,
      href: "/dashboard/finance/bank",
      tone: "neutral",
    });
  const due = [lastYear, tracker]
    .filter(isLiveYear)
    .flatMap((year) => year.obligations)
    .filter((item) => item.status === "due_soon" || item.status === "overdue");
  for (const item of due.slice(0, 2))
    attention.push({
      text: `${item.obligation.form} for ${item.obligation.label.toLowerCase()} ${item.obligation.year} is ${item.status === "overdue" ? "overdue" : "due soon"}`,
      detail: `Due ${formatDate(item.obligation.dueDate)}`,
      href: "/dashboard/finance/taxes",
      tone: item.status === "overdue" ? "danger" : "warning",
    });

  const monthProfit = month.incomeMinor - month.expenseMinor;
  const yearProfit = yearToDate.incomeMinor - yearToDate.expenseMinor;
  const shortcuts = [
    {
      href: "/dashboard/finance/invoices",
      label: "Create an invoice",
      icon: FileText,
      show: can(staff, "invoices:create"),
    },
    {
      href: "/dashboard/finance/payments",
      label: "Record a payment",
      icon: Banknote,
      show: can(staff, "invoices:settle"),
    },
    {
      href: "/dashboard/finance/bills",
      label: "Enter a bill",
      icon: Receipt,
      show: can(staff, "payables:create"),
    },
    {
      href: "/dashboard/finance/expenses",
      label: "Submit an expense",
      icon: WalletCards,
      show: can(staff, "expenses:submit"),
    },
    {
      href: "/dashboard/finance/bank",
      label: "Import a bank statement",
      icon: Upload,
      show: can(staff, "bank:manage"),
    },
    { href: "/dashboard/finance/reports", label: "See the reports", icon: TrendingUp, show: true },
  ].filter((item) => item.show);

  return (
    <>
      <PageHeader
        title="Finance"
        description={`How the business stands today, ${formatDate(today)}.`}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          label="Cash and bank"
          value={formatMinor(cash)}
          icon={Landmark}
          hint="In the books, across cash and bank accounts"
        />
        <StatCard
          label="Owed to you"
          value={formatMinor(invoices.awaiting.amountMinor)}
          icon={Hourglass}
          hint={
            invoices.overdue.count > 0
              ? `${formatMinor(invoices.overdue.amountMinor)} is overdue`
              : "Nothing is overdue"
          }
        />
        <StatCard
          label="You owe"
          value={formatMinor(bills.awaiting.amountMinor)}
          icon={Scale}
          hint={
            bills.overdue.count > 0
              ? `${formatMinor(bills.overdue.amountMinor)} is overdue`
              : "Nothing is overdue"
          }
        />
        <StatCard
          label="Profit this month"
          value={formatMinor(monthProfit)}
          icon={TrendingUp}
          hint={`${formatMinor(yearProfit)} so far this year`}
        />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Income and expenses</CardTitle>
            <CardDescription>The last six months, from the books.</CardDescription>
          </CardHeader>
          <CardContent>
            <IncomeExpenseChart bars={bars} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs your attention</CardTitle>
            <CardDescription>What to do next, most pressing first.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {attention.length === 0 ? (
              <div className="text-muted-foreground flex items-center gap-2 px-4 py-6 text-sm">
                <CircleCheck className="size-4 text-emerald-600" aria-hidden="true" />
                Nothing needs your attention.
              </div>
            ) : (
              <ul className="divide-y">
                {attention.map((item) => (
                  <li key={item.text}>
                    <Link
                      href={item.href}
                      className="hover:bg-muted/40 focus-visible:ring-ring flex items-center gap-3 px-4 py-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <span
                        aria-hidden="true"
                        className={`size-2 shrink-0 rounded-full ${
                          item.tone === "danger"
                            ? "bg-red-500"
                            : item.tone === "warning"
                              ? "bg-amber-500"
                              : "bg-slate-400"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{item.text}</span>
                        {item.detail && (
                          <span className="text-muted-foreground block text-xs">{item.detail}</span>
                        )}
                      </span>
                      <ArrowRight className="text-muted-foreground size-4" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shortcuts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {shortcuts.map((item) => (
            <Button
              key={item.href + item.label}
              variant="outline"
              nativeButton={false}
              render={<Link href={item.href} />}
            >
              <item.icon aria-hidden="true" /> {item.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
