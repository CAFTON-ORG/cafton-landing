import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  Check,
  FolderKanban,
  Handshake,
  Hourglass,
  Landmark,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AttentionList } from "@/components/dashboard/shared/attention-list";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { StatCard } from "@/components/dashboard/shared/stat-card";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { IncomeExpenseChart } from "@/features/finance/components/income-expense-chart";
import { getOverview } from "@/features/overview/repository/overview";
import {
  barWidth,
  count,
  firstName,
  greeting,
  longManilaDate,
  manilaHour,
} from "@/features/overview/rules";
import { can, verifySession } from "@/lib/auth/dal";
import { isDatabaseConfigured } from "@/lib/env";
import { formatRelative } from "@/lib/format";
import { formatMinor } from "@/lib/money";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const staff = await verifySession();
  const now = new Date();
  const data = await getOverview(staff, now);
  const { pipeline, finance, projects, schedule, tasks, people } = data;

  const cards: {
    label: string;
    value: string;
    hint?: string;
    tone?: "neutral" | "warning" | "danger" | "success";
    icon: LucideIcon;
    href: string;
  }[] = [];
  if (pipeline)
    cards.push({
      label: "Open pipeline",
      value: formatMinor(pipeline.openValueMinor),
      hint: `${count(pipeline.openCount, "deal")} open, ${formatMinor(pipeline.weightedMinor)} weighted`,
      icon: Handshake,
      href: "/dashboard/crm/deals",
    });
  if (finance)
    cards.push(
      {
        label: "Cash and bank",
        value: formatMinor(finance.cashMinor),
        hint: `${formatMinor(finance.monthProfitMinor)} profit this month`,
        icon: Landmark,
        href: "/dashboard/finance",
      },
      {
        label: "Owed to you",
        value: formatMinor(finance.owedToYouMinor),
        hint:
          finance.overdueMinor > 0
            ? `${formatMinor(finance.overdueMinor)} is overdue`
            : "Nothing is overdue",
        tone: finance.overdueMinor > 0 ? "danger" : "success",
        icon: Hourglass,
        href: "/dashboard/finance/invoices",
      },
    );
  if (projects)
    cards.push({
      label: "Active projects",
      value: String(projects.active),
      hint:
        projects.overdue > 0
          ? `${projects.overdue} past due, ${projects.planned} planned`
          : `${projects.planned} planned`,
      tone: projects.overdue > 0 ? "warning" : "neutral",
      icon: FolderKanban,
      href: "/dashboard/projects",
    });
  if (cards.length === 0 && people)
    cards.push({
      label: "People with access",
      value: String(people.active),
      hint: `${people.invited} invited`,
      icon: Users,
      href: "/dashboard/users",
    });

  const topStage = Math.max(0, ...(pipeline?.byStage.map((stage) => stage.valueMinor) ?? []));
  const quick = [
    { href: "/dashboard/crm/leads", label: "Leads", show: can(staff, "leads:view") },
    { href: "/dashboard/crm/deals", label: "Deals", show: can(staff, "deals:view") },
    { href: "/dashboard/sales/quotes", label: "Quotes", show: can(staff, "quotes:view") },
    { href: "/dashboard/projects", label: "Projects", show: can(staff, "projects:view") },
    { href: "/dashboard/time", label: "Log time", show: can(staff, "time:view") },
    { href: "/dashboard/finance/invoices", label: "Invoices", show: can(staff, "invoices:view") },
    { href: "/dashboard/crm/schedule", label: "Schedule", show: can(staff, "meetings:view") },
  ].filter((item) => item.show);

  const chart = finance && (
    <Card>
      <CardHeader>
        <CardTitle>Income and expenses</CardTitle>
        <CardDescription>
          The last six months. {formatMinor(finance.yearProfitMinor)} profit so far this year.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <IncomeExpenseChart bars={finance.bars} />
      </CardContent>
    </Card>
  );

  return (
    <>
      <PageHeader
        title={`${greeting(manilaHour(now))}, ${firstName(staff.name)}`}
        description={`${longManilaDate(now)}. Signed in as ${staff.roleName}.`}
      />

      {!isDatabaseConfigured && (
        <p
          role="status"
          className="bg-muted text-muted-foreground mb-6 rounded-lg px-4 py-3 text-sm"
        >
          The database isn&rsquo;t connected, so lists are empty. Add <code>DATABASE_URL</code> to{" "}
          <code>.env.local</code> (or run <code>npm run db:local</code>) to see real data.
        </p>
      )}

      {cards.length > 0 && (
        <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      )}

      <div className="mb-4 grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Needs your attention</CardTitle>
            <CardDescription>What to do next, most pressing first.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <AttentionList items={data.attention} emptyText="You are all caught up." />
          </CardContent>
        </Card>

        {pipeline ? (
          <Card>
            <CardHeader>
              <CardTitle>Sales pipeline</CardTitle>
              <CardDescription>
                Open value by stage. {count(pipeline.wonThisMonthCount, "deal")} won this month (
                {formatMinor(pipeline.wonThisMonthMinor)}).
              </CardDescription>
              <CardAction>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/dashboard/crm/deals" />}
                >
                  Open board
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-3">
              {pipeline.byStage.length === 0 ? (
                <EmptyState title="No open deals" description="Open deals show up here by stage." />
              ) : (
                pipeline.byStage.map((stage) => (
                  <div key={stage.stageId} className="grid gap-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">{stage.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {stage.count} · {formatMinor(stage.valueMinor)}
                      </span>
                    </div>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${barWidth(stage.valueMinor, topStage)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ) : (
          chart
        )}
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[3fr_2fr]">
        {pipeline && chart ? (
          chart
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Your week</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground grid gap-2 text-sm">
              <p className="flex items-center gap-2">
                <Check className="size-4" aria-hidden="true" />
                {tasks ? count(tasks.open, "open task") : "No tasks assigned to you."}
              </p>
              {schedule && (
                <p className="flex items-center gap-2">
                  <CalendarClock className="size-4" aria-hidden="true" />
                  {count(schedule.upcoming, "upcoming meeting")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>The latest changes across the system.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.recent.length === 0 ? (
              <p className="text-muted-foreground px-4 py-6 text-sm">Nothing has changed yet.</p>
            ) : (
              <ul className="divide-y">
                {data.recent.map((entry) => (
                  <li key={entry.id} className="px-4 py-3 text-sm">
                    <p className="font-medium">{entry.summary}</p>
                    <p className="text-muted-foreground text-xs">
                      {entry.actor} · {formatRelative(entry.at, now)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {quick.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Jump to</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {quick.map((item) => (
              <Button
                key={item.href}
                variant="outline"
                nativeButton={false}
                render={<Link href={item.href} />}
              >
                {item.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
