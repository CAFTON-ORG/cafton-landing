import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { TabCount } from "@/components/dashboard/shared/tab-count";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dashboard/ui/tabs";
import { Approvals } from "@/features/delivery/components/approvals";
import { UtilisationReport } from "@/features/delivery/components/utilisation-report";
import { Timesheet } from "@/features/delivery/components/timesheet";
import {
  listLoggable,
  listSubmitted,
  listWeek,
  utilisationReport,
} from "@/features/delivery/repository";
import { reportWeeks, weekStartOf } from "@/features/delivery/rules";
import { addDays, manilaDate } from "@/features/schedule/slots";
import { actorId } from "@/lib/actions";
import { can, verifySession } from "@/lib/auth/dal";
import { Clock } from "lucide-react";

export const metadata: Metadata = { title: "Timesheets" };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export default async function TimePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; tab?: string; weeks?: string }>;
}) {
  const staff = await verifySession();
  const canLog = can(staff, "time:log");
  const canApprove = can(staff, "time:approve");
  const canReport = can(staff, "time:view");
  if (!canLog && !canApprove && !canReport) return <AccessDenied area="timesheets" />;

  const { week, tab, weeks: weeksParam } = await searchParams;
  const weeks = reportWeeks(weeksParam);
  const today = manilaDate(new Date());
  const thisWeek = weekStartOf(today);
  const weekStart = weekStartOf(week && DAY.test(week) ? week : today);
  const me = actorId(staff);

  const [entries, projects, submitted, utilisation] = await Promise.all([
    canLog && me ? listWeek(me, weekStart) : [],
    canLog && me ? listLoggable(me) : [],
    canApprove ? listSubmitted() : [],
    canReport ? utilisationReport(today, weeks) : [],
  ]);
  const toApprove = submitted.filter((entry) => entry.person.id !== me).length;
  const initial =
    tab === "utilisation" && canReport
      ? "utilisation"
      : tab === "approvals" && canApprove
        ? "approvals"
        : canLog
          ? "mine"
          : canApprove
            ? "approvals"
            : "utilisation";

  return (
    <>
      <PageHeader
        title="Timesheets"
        description="Log the hours you work on projects, send the week for approval, and review your team's."
      />
      <Tabs key={initial} defaultValue={initial} className="min-w-0">
        <TabsList className="max-w-full [scrollbar-width:none] justify-start overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden">
          {canLog && <TabsTrigger value="mine">My timesheet</TabsTrigger>}
          {canApprove && (
            <TabsTrigger value="approvals">
              Approvals
              <TabCount n={toApprove} />
            </TabsTrigger>
          )}
          {canReport && <TabsTrigger value="utilisation">Utilisation</TabsTrigger>}
        </TabsList>
        {canLog && (
          <TabsContent value="mine" className="mt-4">
            {me ? (
              <Timesheet
                entries={entries}
                projects={projects}
                weekStart={weekStart}
                today={today}
                previousWeek={addDays(weekStart, -7)}
                nextWeek={addDays(weekStart, 7)}
                thisWeek={thisWeek}
              />
            ) : (
              <EmptyState
                icon={Clock}
                title="Sign in with your own account"
                description="Hours belong to a person, so the preview user can't log any."
              />
            )}
          </TabsContent>
        )}
        {canApprove && (
          <TabsContent value="approvals" className="mt-4">
            <Approvals entries={submitted} me={me ?? ""} />
          </TabsContent>
        )}
        {canReport && (
          <TabsContent value="utilisation" className="mt-4">
            <UtilisationReport rows={utilisation} weeks={weeks} />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
