import "server-only";

import { getForecast, listStages } from "@/features/crm/repository/pipeline";
import { countOpenTasks } from "@/features/crm/repository/tasks";
import { projectTotals } from "@/features/delivery/repository/delivery";
import { countAwaitingApproval } from "@/features/finance/repository/expenses";
import { invoiceSummary } from "@/features/finance/repository/invoices";
import {
  bankLinesToCheck,
  cashPosition,
  monthlyBars,
  profitBetween,
  type MonthBar,
} from "@/features/finance/repository/overview";
import { billSummary } from "@/features/finance/repository/payables";
import { manilaDate } from "@/features/schedule/rules/slots";
import { scheduleCounts } from "@/features/schedule/repository/schedule";
import { listRecentAudit } from "@/features/audit/repository/audit";
import { listAllUsers } from "@/features/users/repository/users";
import { can } from "@/lib/auth/dal";
import { formatMinor } from "@/lib/money";
import { count, rankAttention, type AttentionItem } from "../rules";

type Staff = Parameters<typeof can>[0];

export interface OverviewData {
  today: string;
  pipeline?: Awaited<ReturnType<typeof getForecast>> & { stages: number };
  finance?: {
    cashMinor: number;
    owedToYouMinor: number;
    overdueMinor: number;
    youOweMinor: number;
    monthProfitMinor: number;
    yearProfitMinor: number;
    bars: MonthBar[];
  };
  projects?: { active: number; planned: number; overdue: number; pendingApprovals: number };
  schedule?: { requests: number; upcoming: number };
  tasks?: { open: number; overdue: number };
  people?: { active: number; invited: number };
  recent: Awaited<ReturnType<typeof listRecentAudit>>;
  attention: AttentionItem[];
}

/**
 * Everything the home overview shows, limited to what this person may see: a section the role
 * cannot open is not fetched and not returned, so the page shows only what is theirs.
 */
export async function getOverview(staff: Staff & { id: string }, now: Date): Promise<OverviewData> {
  const today = manilaDate(now);
  const year = today.slice(0, 4);
  const allow = (permission: Parameters<typeof can>[1]) => can(staff, permission);

  const [pipeline, finance, projects, schedule, tasks, people, recent, stages] = await Promise.all([
    allow("deals:view") ? getForecast(now) : undefined,
    allow("finance:view")
      ? Promise.all([
          cashPosition(),
          invoiceSummary(today),
          billSummary(today),
          profitBetween(`${today.slice(0, 7)}-01`, today),
          profitBetween(`${year}-01-01`, today),
          monthlyBars(today, 6),
        ])
      : undefined,
    allow("projects:view") ? projectTotals(today) : undefined,
    allow("meetings:view") ? scheduleCounts(now) : undefined,
    allow("tasks:view") ? countOpenTasks(staff.id, now) : undefined,
    allow("users:view") ? listAllUsers() : undefined,
    allow("audit:view") ? listRecentAudit(6) : [],
    allow("deals:view") ? listStages() : [],
  ]);

  const attention: AttentionItem[] = [];
  if (finance) {
    const [, invoices, bills] = finance;
    if (invoices.overdue.count > 0)
      attention.push({
        text: `${count(invoices.overdue.count, "invoice")} overdue`,
        detail: `${formatMinor(invoices.overdue.amountMinor)} to collect`,
        href: "/dashboard/finance/invoices?state=overdue",
        tone: "danger",
      });
    if (bills.overdue.count > 0)
      attention.push({
        text: `${count(bills.overdue.count, "bill")} overdue`,
        detail: `${formatMinor(bills.overdue.amountMinor)} to pay`,
        href: "/dashboard/finance/bills?state=overdue",
        tone: "danger",
      });
    if (bills.dueSoon.count > 0)
      attention.push({
        text: `${count(bills.dueSoon.count, "bill")} due in the next 7 days`,
        detail: formatMinor(bills.dueSoon.amountMinor),
        href: "/dashboard/finance/bills?state=awaiting",
        tone: "warning",
      });
    if (invoices.draft.count > 0)
      attention.push({
        text: `${count(invoices.draft.count, "draft invoice")} not sent yet`,
        href: "/dashboard/finance/invoices?state=draft",
        tone: "neutral",
      });
  }
  if (allow("expenses:approve")) {
    const waiting = await countAwaitingApproval();
    if (waiting > 0)
      attention.push({
        text: `${count(waiting, "expense")} waiting for your approval`,
        href: "/dashboard/finance/expenses?status=submitted",
        tone: "warning",
      });
  }
  if (allow("bank:view")) {
    const lines = await bankLinesToCheck();
    if (lines > 0)
      attention.push({
        text: `${count(lines, "bank line")} to match or book`,
        href: "/dashboard/finance/bank",
        tone: "neutral",
      });
  }
  if (tasks && tasks.overdue > 0)
    attention.push({
      text: `${count(tasks.overdue, "task")} overdue`,
      detail: `${tasks.open} open in total`,
      href: "/dashboard/crm/tasks",
      tone: "danger",
    });
  if (projects) {
    if (projects.overdue > 0)
      attention.push({
        text: `${count(projects.overdue, "project")} past ${projects.overdue === 1 ? "its" : "their"} due date`,
        href: "/dashboard/projects",
        tone: "danger",
      });
    if (projects.pendingApprovals > 0)
      attention.push({
        text: `${count(projects.pendingApprovals, "time entry", "time entries")} waiting for approval`,
        href: "/dashboard/time",
        tone: "warning",
      });
  }
  if (schedule && schedule.requests > 0)
    attention.push({
      text: `${count(schedule.requests, "meeting request")} to answer`,
      href: "/dashboard/crm/schedule",
      tone: "warning",
    });

  return {
    today,
    pipeline: pipeline ? { ...pipeline, stages: stages.length } : undefined,
    finance: finance
      ? {
          cashMinor: finance[0],
          owedToYouMinor: finance[1].awaiting.amountMinor,
          overdueMinor: finance[1].overdue.amountMinor,
          youOweMinor: finance[2].awaiting.amountMinor,
          monthProfitMinor: finance[3].incomeMinor - finance[3].expenseMinor,
          yearProfitMinor: finance[4].incomeMinor - finance[4].expenseMinor,
          bars: finance[5],
        }
      : undefined,
    projects,
    schedule,
    tasks,
    people: people
      ? {
          active: people.filter((user) => user.status === "Active").length,
          invited: people.filter((user) => user.status === "Invited").length,
        }
      : undefined,
    recent,
    attention: rankAttention(attention),
  };
}
