import { describe, expect, it } from "vitest";

import {
  BACKDATE_DAYS,
  canEditEntry,
  checkLogTime,
  checkMilestone,
  checkMilestoneDone,
  checkProject,
  checkProjectStatusChange,
  checkReview,
  checkSubmitWeek,
  checkTask,
  completedAtFor,
  costOf,
  durationInput,
  formatMinutes,
  hoursText,
  hoursUsage,
  isOverdue,
  margin,
  nextProjectStatuses,
  parseDuration,
  progressPercent,
  reportStart,
  reportWeeks,
  checkPortfolioLink,
  utilisation,
  weekDates,
  weekStartOf,
  type LogFacts,
} from "./rules";

const none = { openTasks: 0, pendingTime: 0, unfinishedBillable: 0 };

describe("project status", () => {
  it("moves along the allowed paths only", () => {
    expect(nextProjectStatuses("planned")).toEqual(["active", "cancelled"]);
    expect(checkProjectStatusChange("planned", "active", none)).toBeNull();
    expect(checkProjectStatusChange("planned", "completed", none)).toMatch(/can't go straight/);
    expect(checkProjectStatusChange("on_hold", "active", none)).toBeNull();
    expect(checkProjectStatusChange("active", "active", none)).toBeNull();
  });

  it("can be reopened after completing or cancelling", () => {
    expect(checkProjectStatusChange("completed", "active", none)).toBeNull();
    expect(checkProjectStatusChange("cancelled", "planned", none)).toBeNull();
    expect(checkProjectStatusChange("cancelled", "active", none)).not.toBeNull();
  });

  it("completes only when the loose ends are tied up", () => {
    expect(checkProjectStatusChange("active", "completed", { ...none, openTasks: 2 })).toMatch(
      /2 tasks are not done/,
    );
    expect(
      checkProjectStatusChange("active", "completed", { ...none, unfinishedBillable: 1 }),
    ).toMatch(/1 billable milestone is not done/);
    expect(checkProjectStatusChange("active", "completed", { ...none, pendingTime: 3 })).toMatch(
      /3 time entries are waiting for approval/,
    );
    expect(checkProjectStatusChange("active", "completed", none)).toBeNull();
    // Cancelling is never held up by them.
    expect(checkProjectStatusChange("active", "cancelled", { ...none, openTasks: 5 })).toBeNull();
  });

  it("needs a name and sensible dates", () => {
    expect(checkProject({ name: "  " }).name).toBeTruthy();
    expect(checkProject({ name: "x".repeat(161) }).name).toBeTruthy();
    expect(
      checkProject({ name: "Site", startDate: "2026-11-10", dueDate: "2026-11-01" }).dueDate,
    ).toBeTruthy();
    expect(checkProject({ name: "Site", startDate: "2026-11-01", dueDate: "2026-11-01" })).toEqual(
      {},
    );
  });
});

describe("milestones", () => {
  const base = {
    name: "Design",
    billable: false,
    amountMinor: null,
    otherBillableMinor: 0,
    budgetMinor: 100000,
  };

  it("needs a name; a plain milestone needs no amount", () => {
    expect(checkMilestone({ ...base, name: "" }).name).toBeTruthy();
    expect(checkMilestone(base)).toEqual({});
  });

  it("asks a billable milestone for an amount, and keeps them within the price", () => {
    expect(checkMilestone({ ...base, billable: true }).amount).toMatch(/needs the amount/);
    expect(checkMilestone({ ...base, billable: true, amountMinor: 0 }).amount).toBeTruthy();
    expect(checkMilestone({ ...base, billable: true, amountMinor: 60000 })).toEqual({});
    expect(
      checkMilestone({ ...base, billable: true, amountMinor: 60000, otherBillableMinor: 50000 })
        .amount,
    ).toMatch(/more than the project's price/);
    // Without a price there is nothing to exceed.
    expect(
      checkMilestone({ ...base, billable: true, amountMinor: 999999, budgetMinor: null }),
    ).toEqual({});
  });

  it("is done only when its tasks are", () => {
    expect(checkMilestoneDone(0)).toBeNull();
    expect(checkMilestoneDone(1)).toMatch(/1 task is not done/);
  });
});

describe("tasks", () => {
  it("needs a title and an assignee who is on the team", () => {
    expect(checkTask({ title: " ", memberIds: [] }).title).toBeTruthy();
    expect(
      checkTask({ title: "Wireframes", assigneeId: "p2", memberIds: ["p1"] }).assigneeId,
    ).toMatch(/team/);
    expect(checkTask({ title: "Wireframes", assigneeId: "p1", memberIds: ["p1"] })).toEqual({});
    expect(checkTask({ title: "Wireframes", assigneeId: null, memberIds: [] })).toEqual({});
  });

  it("stamps completion when a task becomes done and clears it when reopened", () => {
    const now = new Date("2026-11-10T00:00:00Z");
    const earlier = new Date("2026-11-01T00:00:00Z");
    expect(completedAtFor({ status: "todo", completedAt: null }, "done", now)).toEqual(now);
    expect(completedAtFor({ status: "done", completedAt: earlier }, "done", now)).toEqual(earlier);
    expect(completedAtFor({ status: "done", completedAt: earlier }, "review", now)).toBeNull();
  });

  it("reads progress and lateness", () => {
    expect(progressPercent({ total: 0, done: 0 })).toBe(0);
    expect(progressPercent({ total: 3, done: 1 })).toBe(33);
    expect(isOverdue("2026-11-01", "2026-11-02", false)).toBe(true);
    expect(isOverdue("2026-11-01", "2026-11-02", true)).toBe(false);
    expect(isOverdue(null, "2026-11-02", false)).toBe(false);
  });
});

describe("durations", () => {
  it.each([
    ["1.5", 90],
    ["1.5h", 90],
    ["2", 120],
    ["1:30", 90],
    ["90m", 90],
    ["2h 15m", 135],
    ["2h15m", 135],
    ["45 min", 45],
    ["0.25", 15],
  ])("reads %s as %i minutes", (text, minutes) => {
    expect(parseDuration(text)).toBe(minutes);
  });

  it.each(["", "abc", "1:75", "h", "1..5", "-2", "2x"])("rejects %s", (text) => {
    expect(parseDuration(text)).toBeNull();
  });

  it("writes a duration the way a form field takes it back", () => {
    expect(durationInput(7200)).toBe("120");
    expect(durationInput(90)).toBe("1:30");
    expect(durationInput(65)).toBe("1:05");
    expect(parseDuration(durationInput(7205))).toBe(7205);
  });

  it("writes minutes the way people read them", () => {
    expect(formatMinutes(0)).toBe("0h");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(120)).toBe("2h");
    expect(formatMinutes(90)).toBe("1h 30m");
    expect(hoursText(90)).toBe("1.5");
    expect(hoursText(100)).toBe("1.67");
  });
});

describe("weeks", () => {
  it("starts on Monday", () => {
    expect(weekStartOf("2026-11-02")).toBe("2026-11-02"); // a Monday
    expect(weekStartOf("2026-11-04")).toBe("2026-11-02");
    expect(weekStartOf("2026-11-08")).toBe("2026-11-02"); // Sunday belongs to the week before
    expect(weekStartOf("2026-11-09")).toBe("2026-11-09");
  });

  it("lists the seven days", () => {
    const days = weekDates("2026-11-02");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-11-02");
    expect(days[6]).toBe("2026-11-08");
  });
});

describe("logging time", () => {
  const ok: LogFacts = {
    minutes: 120,
    workDate: "2026-11-10",
    today: "2026-11-10",
    otherMinutesThatDay: 0,
    projectStatus: "active",
    isMember: true,
  };

  it("accepts ordinary time", () => {
    expect(checkLogTime(ok)).toEqual({});
    expect(checkLogTime({ ...ok, workDate: "2026-11-09" })).toEqual({});
  });

  it("refuses unreadable, empty and impossible amounts", () => {
    expect(checkLogTime({ ...ok, minutes: null }).minutes).toMatch(/like 1.5/);
    expect(checkLogTime({ ...ok, minutes: 0 }).minutes).toMatch(/more than zero/);
    expect(checkLogTime({ ...ok, minutes: 600, otherMinutesThatDay: 900 }).minutes).toMatch(
      /24 hours/,
    );
    expect(checkLogTime({ ...ok, minutes: 540, otherMinutesThatDay: 900 })).toEqual({});
  });

  it("refuses the future and the distant past", () => {
    expect(checkLogTime({ ...ok, workDate: "2026-11-11" }).workDate).toMatch(/hasn't happened/);
    const old = "2026-09-01";
    expect(checkLogTime({ ...ok, workDate: old }).workDate).toContain(String(BACKDATE_DAYS));
  });

  it("is for members, on a project that is going", () => {
    expect(checkLogTime({ ...ok, isMember: false }).form).toMatch(/not on this project's team/);
    expect(checkLogTime({ ...ok, projectStatus: "planned" }).form).toMatch(/hasn't started/);
    expect(checkLogTime({ ...ok, projectStatus: "on_hold" }).form).toMatch(/on hold/);
    expect(checkLogTime({ ...ok, projectStatus: "completed" }).form).toMatch(/completed/);
  });

  it("lets drafts and sent-back entries be changed, nothing else", () => {
    expect(canEditEntry("draft")).toBe(true);
    expect(canEditEntry("rejected")).toBe(true);
    expect(canEditEntry("submitted")).toBe(false);
    expect(canEditEntry("approved")).toBe(false);
  });
});

describe("submitting and reviewing", () => {
  it("needs something to send", () => {
    expect(checkSubmitWeek([])).toMatch(/no unsent time/);
    expect(checkSubmitWeek([{ status: "approved" }, { status: "submitted" }])).toMatch(/no unsent/);
    expect(checkSubmitWeek([{ status: "draft" }])).toBeNull();
    expect(checkSubmitWeek([{ status: "rejected" }])).toBeNull();
  });

  const entry = (profileId: string, status = "submitted" as const) => ({ profileId, status });

  it("never lets anyone review their own hours", () => {
    expect(
      checkReview({
        reviewerId: "me",
        action: "approve",
        note: "",
        entries: [entry("me"), entry("you")],
      }),
    ).toMatch(/your own hours/);
    expect(
      checkReview({ reviewerId: "me", action: "approve", note: "", entries: [entry("you")] }),
    ).toBeNull();
  });

  it("reviews only submitted time, and sending back needs a reason", () => {
    expect(
      checkReview({
        reviewerId: "me",
        action: "approve",
        note: "",
        entries: [entry("you", "draft" as never)],
      }),
    ).toMatch(/Only time that has been submitted/);
    expect(
      checkReview({ reviewerId: "me", action: "reject", note: "  ", entries: [entry("you")] }),
    ).toMatch(/Say why/);
    expect(
      checkReview({
        reviewerId: "me",
        action: "reject",
        note: "Wrong project",
        entries: [entry("you")],
      }),
    ).toBeNull();
    expect(checkReview({ reviewerId: "me", action: "approve", note: "", entries: [] })).toMatch(
      /nothing to review/,
    );
  });
});

describe("budget and utilisation", () => {
  it("compares hours used with the hours the price assumed", () => {
    expect(hoursUsage(null, 600)).toEqual({ percent: 0, over: false, remainingMinutes: null });
    expect(hoursUsage(600, 300)).toEqual({ percent: 50, over: false, remainingMinutes: 300 });
    expect(hoursUsage(600, 660)).toEqual({ percent: 110, over: true, remainingMinutes: -60 });
  });

  it("costs time at the hourly rate, in whole minor units", () => {
    expect(costOf(90, 60000)).toBe(90000);
    expect(costOf(20, 10000)).toBe(3333);
    expect(costOf(90, null)).toBe(0);
  });

  it("measures billable share of available hours", () => {
    expect(utilisation(1800, 2400)).toBe(75);
    expect(utilisation(100, 0)).toBe(0);
  });
});

describe("margin and reports", () => {
  it("keeps what is left of the price after cost", () => {
    expect(margin(null, 5000)).toBeNull();
    expect(margin(100000, 40000)).toEqual({ amountMinor: 60000, percent: 60 });
    expect(margin(100000, 125000)).toEqual({ amountMinor: -25000, percent: -25 });
    expect(margin(0, 0)).toEqual({ amountMinor: 0, percent: null });
  });

  it("offers a few ranges and defaults to four weeks", () => {
    expect(reportWeeks("8")).toBe(8);
    expect(reportWeeks("5")).toBe(4);
    expect(reportWeeks(undefined)).toBe(4);
    expect(reportStart("2026-11-18", 1)).toBe("2026-11-16");
    expect(reportStart("2026-11-18", 4)).toBe("2026-10-26");
  });

  it("links only a completed project to an entry nobody else uses", () => {
    const ok = { projectStatus: "completed" as const, slugExists: true, linkedElsewhere: false };
    expect(checkPortfolioLink(ok)).toBeNull();
    expect(checkPortfolioLink({ ...ok, projectStatus: "active" })).toMatch(/completed project/);
    expect(checkPortfolioLink({ ...ok, slugExists: false })).toMatch(/no longer exists/);
    expect(checkPortfolioLink({ ...ok, linkedElsewhere: true })).toMatch(/another project/);
  });
});
