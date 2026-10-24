import type { Metadata } from "next";

import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { listStaffOptions } from "@/features/crm/repository/pipeline";
import { ScheduleView } from "@/features/schedule/components/schedule-view";
import { listMeetings, listRequests } from "@/features/schedule/repository/schedule";
import { monthGrid } from "@/features/schedule/rules/calendar";
import { fromManila, addDays, manilaDate } from "@/features/schedule/rules/slots";
import { requirePageAccess } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requirePageAccess("meetings:view");
  if (!staff) return <AccessDenied area="the schedule" />;

  const now = new Date();
  const today = manilaDate(now);
  const raw = await searchParams;
  const requested =
    typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : today;

  const view = raw.view === "week" ? "week" : "month";

  // Everything the calendar shows: the whole weeks around the month holding the chosen day.
  const grid = monthGrid(requested);
  const from = fromManila(grid[0], "00:00");
  const to = fromManila(addDays(grid[grid.length - 1], 1), "00:00");
  const [meetings, requests, people] = await Promise.all([
    listMeetings(from, to),
    listRequests(now),
    listStaffOptions(),
  ]);

  return (
    <>
      <PageHeader
        title="Schedule"
        description="Calls and meetings with leads and clients. Visitors can ask for a time on the contact form."
      />
      <ScheduleView
        view={view}
        date={requested}
        today={today}
        meetings={meetings}
        requests={requests}
        people={people}
      />
    </>
  );
}
