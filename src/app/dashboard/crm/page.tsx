import type { Metadata } from "next";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import Link from "next/link";
import {
  CalendarClock,
  CircleCheck,
  ChartNoAxesColumn,
  Handshake,
  Inbox,
  ListChecks,
  Percent,
  Trophy,
  Wallet,
} from "lucide-react";

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
import { listMeetings, listRequests } from "@/features/schedule/repository";
import { formatManila } from "@/features/schedule/slots";
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
  const showMeetings = can(staff, "meetings:view");
  const now = new Date();
  const [forecast, newLeads, tasks, recentLeads, requests, upcoming] = await Promise.all([
    getForecast(),
    showLeads ? countNewLeads() : 0,
    showTasks ? countOpenTasks(actorId(staff)) : { open: 0, overdue: 0 },
    showLeads ? listLeads(parseTableParams(new URLSearchParams("status=new"), LEADS_TABLE)) : null,
    showMeetings ? listRequests(now) : [],
    showMeetings ? listMeetings(now, new Date(now.getTime() + 14 * 86_400_000)) : [],
  ]);
  const decided = forecast.wonThisMonthCount + forecast.lostThisMonthCount;
  const winRate = decided ? Math.round((forecast.wonThisMonthCount / decided) * 100) : null;
  const confirmed = upcoming.filter((meeting) => meeting.status === "confirmed").slice(0, 5);
  const attention = [
    ...(requests.length
      ? [
          {
            href: "/dashboard/crm/schedule",
            label: `${requests.length} meeting ${requests.length === 1 ? "request" : "requests"} to answer`,
          },
        ]
      : []),
    ...(showLeads && newLeads
      ? [
          {
            href: "/dashboard/crm/leads?status=new",
            label: `${newLeads} new ${newLeads === 1 ? "enquiry" : "enquiries"} waiting for a first look`,
          },
        ]
      : []),
    ...(showTasks && tasks.overdue
      ? [
          {
            href: "/dashboard/crm/tasks",
            label: `${tasks.overdue} overdue ${tasks.overdue === 1 ? "task" : "tasks"}`,
          },
        ]
      : []),
  ];
  const biggest = Math.max(1, ...forecast.byStage.map((stage) => stage.valueMinor));

  return (
    <>
      <PageHeader
        title="Pipeline overview"
        description="Where the sales pipeline stands right now."
      />

      {attention.length > 0 && (
        <Card className="mb-4 border-amber-500/40">
          <CardHeader>
            <CardTitle>Needs your attention</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1.5 text-sm">
              {attention.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="underline underline-offset-4">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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
        <StatCard
          label="Win rate this month"
          value={winRate === null ? "—" : `${winRate}%`}
          hint={decided ? `${decided} deals decided` : "No deals closed yet this month"}
          icon={Percent}
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
              <EmptyState
                compact
                icon={ChartNoAxesColumn}
                title="No pipeline yet"
                description="Open deals show up here by stage."
              />
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

        {showMeetings && (
          <Card>
            <CardHeader>
              <CardTitle>Upcoming meetings</CardTitle>
              <CardDescription>
                Next two weeks.{" "}
                <Link href="/dashboard/crm/schedule" className="underline underline-offset-4">
                  Open the schedule
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {confirmed.length === 0 ? (
                <EmptyState
                  compact
                  icon={CalendarClock}
                  title="No meetings coming up"
                  description="Confirmed meetings in the next two weeks appear here."
                />
              ) : (
                <ul className="divide-y">
                  {confirmed.map((meeting) => (
                    <li key={meeting.id} className="flex items-center gap-3 py-2">
                      <CalendarClock
                        className="text-muted-foreground size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{meeting.title}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {meeting.attendeeName} · {formatManila(new Date(meeting.startsAt))}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

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
                <EmptyState
                  compact
                  icon={CircleCheck}
                  title="All caught up"
                  description="New enquiries from the contact form land here."
                />
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
