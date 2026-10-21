import type { Metadata } from "next";
import Link from "next/link";
import { Handshake, Inbox, ListChecks, Trophy, Wallet } from "lucide-react";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { StatCard } from "@/components/dashboard/shared/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { LeadStatusBadge } from "@/features/crm/components/badges";
import { listLeads } from "@/features/crm/repository/leads";
import { countNewLeads } from "@/features/crm/repository/leads";
import { getForecast } from "@/features/crm/repository/pipeline";
import { countOpenTasks } from "@/features/crm/repository/tasks";
import { LEADS_TABLE } from "@/features/crm/table";
import { actorId } from "@/lib/actions";
import { can, requirePageAccess } from "@/lib/auth/dal";
import { formatRelative } from "@/lib/format";
import { formatMinor } from "@/lib/money";
import { parseTableParams } from "@/lib/table-params";

export const metadata: Metadata = { title: "Pipeline overview" };

export default async function CrmOverviewPage() {
  const staff = await requirePageAccess("deals:view");
  if (!staff) return <AccessDenied area="the pipeline" />;

  const showLeads = can(staff, "leads:view");
  const showTasks = can(staff, "tasks:view");
  const [forecast, newLeads, tasks, recentLeads] = await Promise.all([
    getForecast(),
    showLeads ? countNewLeads() : 0,
    showTasks ? countOpenTasks(actorId(staff)) : { open: 0, overdue: 0 },
    showLeads ? listLeads(parseTableParams(new URLSearchParams("status=new"), LEADS_TABLE)) : null,
  ]);
  const biggest = Math.max(1, ...forecast.byStage.map((stage) => stage.valueMinor));

  return (
    <>
      <PageHeader
        title="Pipeline overview"
        description="Where the sales pipeline stands right now."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open pipeline"
          value={formatMinor(forecast.openValueMinor, forecast.currency, { compact: true })}
          hint={`${forecast.openCount} open ${forecast.openCount === 1 ? "deal" : "deals"}`}
          icon={Handshake}
        />
        <StatCard
          label="Weighted forecast"
          value={formatMinor(forecast.weightedMinor, forecast.currency, { compact: true })}
          hint="Each deal times its stage's win chance"
          icon={Wallet}
        />
        <StatCard
          label="Won this month"
          value={formatMinor(forecast.wonThisMonthMinor, forecast.currency, { compact: true })}
          hint={`${forecast.wonThisMonthCount} won · ${forecast.lostThisMonthCount} lost`}
          icon={Trophy}
        />
        {showLeads ? (
          <StatCard
            label="New enquiries"
            value={String(newLeads)}
            hint="Waiting for a first look"
            icon={Inbox}
          />
        ) : (
          showTasks && (
            <StatCard
              label="Open tasks"
              value={String(tasks.open)}
              hint={`${tasks.overdue} overdue`}
              icon={ListChecks}
            />
          )
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by stage</CardTitle>
            <CardDescription>Open deal value in each stage.</CardDescription>
          </CardHeader>
          <CardContent>
            {forecast.byStage.length === 0 ? (
              <p className="text-muted-foreground text-sm">No pipeline data yet.</p>
            ) : (
              <ul className="grid gap-3">
                {forecast.byStage.map((stage) => (
                  <li key={stage.stageId}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">{stage.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {stage.count} ·{" "}
                        {formatMinor(stage.valueMinor, forecast.currency, { compact: true })}
                      </span>
                    </div>
                    <div
                      className="bg-muted mt-1 h-2 overflow-hidden rounded-full"
                      role="presentation"
                    >
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${Math.max(2, (stage.valueMinor / biggest) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {recentLeads && (
          <Card>
            <CardHeader>
              <CardTitle>New enquiries</CardTitle>
              <CardDescription>
                <Link href="/dashboard/crm/leads" className="underline underline-offset-4">
                  See all leads
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentLeads.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No new enquiries. You&rsquo;re all caught up.
                </p>
              ) : (
                <ul className="divide-y">
                  {recentLeads.items.slice(0, 6).map((lead) => (
                    <li key={lead.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/crm/leads/${lead.id}`}
                          className="text-sm font-medium underline-offset-4 hover:underline"
                        >
                          {lead.name}
                        </Link>
                        <p className="text-muted-foreground truncate text-xs">
                          {lead.businessName ?? lead.goalsArea ?? lead.email}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <LeadStatusBadge status={lead.status} />
                        <time dateTime={lead.createdAt} className="text-muted-foreground text-xs">
                          {formatRelative(lead.createdAt)}
                        </time>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
