import { describe, expect, it } from "vitest";

import {
  checkAddTaskToDeal,
  checkContactDelete,
  checkConvert,
  checkDealDelete,
  checkDisqualify,
  checkEmailable,
  checkEditAmount,
  checkLeadDelete,
  checkMergeLeads,
  checkLose,
  checkMoveDeal,
  checkOrganizationDelete,
  checkQualify,
  checkReopenDeal,
  checkReopenLead,
  checkWin,
  mergedLeadStatus,
  normaliseEmail,
  taskUrgency,
} from "./core";

const open = { stageKind: "open" as const, amountMinor: 100000 };
const won = { stageKind: "won" as const, amountMinor: 100000 };
const lost = { stageKind: "lost" as const, amountMinor: 100000 };

describe("lead lifecycle", () => {
  it("qualifies only a new lead", () => {
    expect(checkQualify({ status: "new" })).toBeNull();
    expect(checkQualify({ status: "qualified" })).toMatch(/already/);
    expect(checkQualify({ status: "disqualified" })).toMatch(/Reopen/);
    expect(checkQualify({ status: "converted" })).toMatch(/converted/);
  });

  it("requires a reason to disqualify and blocks converted leads", () => {
    expect(checkDisqualify({ status: "new" }, "  ")).toMatch(/why/);
    expect(checkDisqualify({ status: "qualified" }, "Out of budget")).toBeNull();
    expect(checkDisqualify({ status: "converted" }, "x")).toMatch(/converted/);
  });

  it("reopens only disqualified leads and converts only live ones", () => {
    expect(checkReopenLead({ status: "disqualified" })).toBeNull();
    expect(checkReopenLead({ status: "new" })).toMatch(/Only a disqualified/);
    expect(checkConvert({ status: "new" })).toBeNull();
    expect(checkConvert({ status: "qualified" })).toBeNull();
    expect(checkConvert({ status: "disqualified" })).toMatch(/Reopen/);
    expect(checkConvert({ status: "converted" })).toMatch(/already/);
  });

  it("keeps converted leads as history", () => {
    expect(checkLeadDelete({ status: "converted" })).toMatch(/history/);
    expect(checkLeadDelete({ status: "new" })).toBeNull();
  });
});

describe("deal lifecycle", () => {
  it("moves open deals between open stages only", () => {
    expect(checkMoveDeal(open, { kind: "open" })).toBeNull();
    expect(checkMoveDeal(open, { kind: "won" })).toMatch(/Mark as won/);
    expect(checkMoveDeal(open, { kind: "lost" })).toMatch(/Mark as lost/);
    expect(checkMoveDeal(won, { kind: "open" })).toMatch(/Reopen/);
    expect(checkMoveDeal(lost, { kind: "open" })).toMatch(/Reopen/);
  });

  it("needs a value to win and a reason to lose", () => {
    expect(checkWin(open)).toBeNull();
    expect(checkWin({ stageKind: "open", amountMinor: null })).toMatch(/final value/);
    expect(checkWin({ stageKind: "open", amountMinor: 0 })).toMatch(/final value/);
    expect(checkWin(won)).toMatch(/already won/);
    expect(checkWin(lost)).toMatch(/Reopen/);
    expect(checkLose(open, "")).toMatch(/why/);
    expect(checkLose(open, "Chose a competitor")).toBeNull();
    expect(checkLose(won, "x")).toMatch(/Reopen/);
  });

  it("reopens closed deals unless payments exist", () => {
    expect(checkReopenDeal(open)).toMatch(/already open/);
    expect(checkReopenDeal(won)).toBeNull();
    expect(checkReopenDeal(won, true)).toMatch(/payments/);
  });

  it("locks a won deal's value and forbids deleting it", () => {
    expect(checkEditAmount(won)).toMatch(/locked/);
    expect(checkEditAmount(open)).toBeNull();
    expect(checkDealDelete(won)).toMatch(/can't be deleted/);
    expect(checkDealDelete(lost)).toBeNull();
  });

  it("allows tasks only on open deals", () => {
    expect(checkAddTaskToDeal(open)).toBeNull();
    expect(checkAddTaskToDeal(lost)).toMatch(/closed/);
  });
});

describe("delete guards", () => {
  it("protects contacts and organizations that still have dependants, with correct plurals", () => {
    expect(checkContactDelete({ liveDeals: 0 })).toBeNull();
    expect(checkContactDelete({ liveDeals: 1 })).toMatch(/1 deal\./);
    expect(checkContactDelete({ liveDeals: 3 })).toMatch(/3 deals\./);
    expect(checkOrganizationDelete({ contacts: 0, deals: 0 })).toBeNull();
    expect(checkOrganizationDelete({ contacts: 2, deals: 0 })).toMatch(/2 contacts/);
    expect(checkOrganizationDelete({ contacts: 2, deals: 1 })).toMatch(/1 deal\./);
  });
});

describe("taskUrgency", () => {
  const now = new Date("2026-10-21T10:00:00");
  const at = (iso: string) => new Date(iso);

  it("classifies by due date relative to today", () => {
    expect(taskUrgency({ dueAt: at("2026-10-20T09:00:00"), doneAt: null }, now)).toBe("overdue");
    expect(taskUrgency({ dueAt: at("2026-10-21T17:00:00"), doneAt: null }, now)).toBe("today");
    expect(taskUrgency({ dueAt: at("2026-10-22T00:00:00"), doneAt: null }, now)).toBe("upcoming");
    expect(taskUrgency({ dueAt: null, doneAt: null }, now)).toBe("none");
  });

  it("treats a finished task as done even if it was late", () => {
    expect(
      taskUrgency({ dueAt: at("2026-10-01T00:00:00"), doneAt: at("2026-10-02T00:00:00") }, now),
    ).toBe("done");
  });
});

describe("normaliseEmail", () => {
  it("is case and space insensitive", () => {
    expect(normaliseEmail("  Ada@Cafton.COM ")).toBe("ada@cafton.com");
  });
});

describe("merging leads", () => {
  it("refuses a converted lead, which is part of a deal's history", () => {
    expect(checkMergeLeads([{ status: "new" }, { status: "disqualified" }])).toBeNull();
    expect(checkMergeLeads([{ status: "new" }, { status: "converted" }])).toMatch(/converted/);
  });

  it("keeps the kept lead's status, but never undoes qualification work", () => {
    expect(mergedLeadStatus("new", ["new"])).toBe("new");
    expect(mergedLeadStatus("new", ["qualified"])).toBe("qualified");
    expect(mergedLeadStatus("qualified", ["new"])).toBe("qualified");
    expect(mergedLeadStatus("disqualified", ["qualified"])).toBe("disqualified");
  });
});

describe("checkEmailable", () => {
  it("needs an address that looks like one", () => {
    expect(checkEmailable("ada@example.com")).toBeNull();
    expect(checkEmailable("  ada@example.com  ")).toBeNull();
    expect(checkEmailable("")).toMatch(/no email address/);
    expect(checkEmailable(null)).toMatch(/no email address/);
    expect(checkEmailable("not-an-address")).toMatch(/doesn't look right/);
  });
});
