import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../../../scripts/pglite-setup.mjs";
import { SYSTEM_ROLE_PERMISSIONS, type Permission } from "@/lib/auth/permissions";

/**
 * Delivery against a real Postgres (PGlite) built from the real migrations: a project starting from
 * an accepted quote, the rules for its status, team, milestones and tasks, and the database's own
 * refusal to change approved time.
 */

const person = (id: string, roleKey: "owner" | "sales" | "viewer") => ({
  id,
  name: `${roleKey} ${id.slice(0, 4)}`,
  email: `${roleKey}-${id.slice(0, 4)}@cafton.com`,
  roleKey,
  roleName: roleKey,
  permissions: SYSTEM_ROLE_PERMISSIONS[roleKey],
});
const OWNER = person("55555555-5555-4555-8555-555555555555", "owner");
const SALES = person("77777777-7777-4777-8777-777777777777", "sales");
const VIEWER = person("88888888-8888-4888-8888-888888888888", "viewer");
let current = OWNER;

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.30", "user-agent": "Test/1" }),
}));
vi.mock("@/lib/auth/dal", () => ({
  requirePermission: vi.fn(async (permission: Permission) => {
    if (!current.permissions.includes(permission)) {
      const { ForbiddenError } = await import("@/lib/actions");
      throw new ForbiddenError();
    }
    return current;
  }),
  verifySession: vi.fn(async () => current),
  can: (staff: { permissions: readonly string[] }, permission: Permission) =>
    staff.permissions.includes(permission),
}));

let db: PGlite;
let server: PGLiteSocketServer;
let prisma: typeof import("@/lib/db").prisma;
let quotes: typeof import("@/features/sales/actions/quotes");
let quotePublic: typeof import("@/features/sales/public");
let deals: typeof import("@/features/crm/actions/deals");
let projects: typeof import("./actions/projects");
let work: typeof import("./actions/work");
let repo: typeof import("./repository");
let handlers: typeof import("./handlers");

const inDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const tokenOf = (result: unknown) =>
  (result as { data: { link: string } }).data.link.split("/").pop() as string;

beforeAll(async () => {
  db = (await createDatabase()) as PGlite;
  server = new PGLiteSocketServer({ db, port: 0, host: "127.0.0.1", maxConnections: 4 });
  await server.start();
  const port = (server as unknown as { server: { address(): { port: number } } }).server.address()
    .port;
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_POOL_MAX = "1";
  for (const user of [OWNER, SALES, VIEWER]) {
    await db
      .exec(`INSERT INTO auth.users (id, email) VALUES ('${user.id}', '${user.email}')`)
      .catch(() => undefined);
    await db.exec(
      `INSERT INTO profiles (id, email, full_name, role_id)
       SELECT '${user.id}', '${user.email}', '${user.name}', id FROM roles WHERE key = '${user.roleKey}' ON CONFLICT DO NOTHING`,
    );
  }
  ({ prisma } = await import("@/lib/db"));
  quotes = await import("@/features/sales/actions/quotes");
  quotePublic = await import("@/features/sales/public");
  deals = await import("@/features/crm/actions/deals");
  projects = await import("./actions/projects");
  work = await import("./actions/work");
  repo = await import("./repository");
  // Connects the project to the "quote accepted" event, as the server does when it starts.
  handlers = await import("./handlers");
}, 120_000);

afterAll(async () => {
  await server?.stop();
  await db?.close();
});

let counter = 0;
async function newDeal(ownerId?: string) {
  counter += 1;
  const contact = await prisma.contact.create({
    data: {
      firstName: "Dara",
      lastName: `Client${counter}`,
      email: `delivery-${counter}@example.com`,
    },
  });
  const stage = await prisma.pipelineStage.findFirstOrThrow({
    where: { kind: "open", pipeline: { isDefault: true } },
    orderBy: { position: "asc" },
  });
  return prisma.deal.create({
    data: { title: `Deal ${counter}`, contactId: contact.id, stageId: stage.id, ownerId },
  });
}

async function acceptedQuoteOn(dealId: string, price = "100,000.00") {
  const made = (await quotes.createQuote(dealId)) as { data: { id: string } };
  await quotes.saveQuote(made.data.id, {
    title: "Build",
    intro: "",
    terms: "",
    paymentTerms: "Bank transfer.",
    depositPct: 50,
    validUntil: inDays(30),
    lines: [
      {
        description: "Work",
        quantity: "1",
        unitLabel: "project",
        price,
        discountPct: 0,
        taxable: false,
      },
    ],
  });
  await quotes.submitQuote(made.data.id);
  const sent = await quotes.sendQuote(made.data.id);
  await quotePublic.respondToQuote({
    action: "accept",
    token: tokenOf(sent),
    name: "Dara Client",
    email: "",
    agreed: true,
  });
  return made.data.id;
}

async function wonDeal() {
  const deal = await newDeal(OWNER.id);
  expect((await deals.winDeal(deal.id, "50000")).ok).toBe(true);
  return deal;
}

const project = async (over: Record<string, unknown> = {}) => {
  const result = await projects.createProject({
    name: "Website rebuild",
    description: "",
    dealId: "",
    managerId: OWNER.id,
    startDate: "",
    dueDate: "",
    budget: "100000",
    budgetHours: "100",
    ...over,
  });
  expect(result.ok, JSON.stringify(result)).toBe(true);
  return (result as { data: { id: string } }).data.id;
};

describe("a project from an accepted quote", () => {
  it("starts once, priced at the quote, for the deal's client and owner", async () => {
    const deal = await newDeal(SALES.id);
    const quoteId = await acceptedQuoteOn(deal.id);

    const started = await prisma.project.findMany({ where: { dealId: deal.id } });
    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({
      name: deal.title,
      quoteId,
      contactId: deal.contactId,
      managerId: SALES.id,
      status: "planned",
      currency: "PHP",
    });
    expect(Number(started[0].budgetMinor)).toBe(10_000_000);
    expect(started[0].reference).toMatch(/^PRJ-\d{4}-\d{4}$/);
    // The manager is on the team from the start, and the deal's timeline says what happened.
    expect(
      await prisma.projectMember.count({
        where: { projectId: started[0].id, profileId: SALES.id },
      }),
    ).toBe(1);
    expect(
      await prisma.activity.count({
        where: { dealId: deal.id, body: { contains: started[0].reference } },
      }),
    ).toBe(1);
    expect(
      await prisma.notification.count({ where: { userId: SALES.id, kind: "project" } }),
    ).toBeGreaterThan(0);
  });

  it("is safe to run twice: the same event changes nothing", async () => {
    const deal = await newDeal();
    const quoteId = await acceptedQuoteOn(deal.id);
    const before = await prisma.project.count({ where: { dealId: deal.id } });
    await handlers.startProjectFromQuote({
      quoteId,
      reference: "QT-X",
      dealId: deal.id,
      totalMinor: 1,
      currency: "PHP",
      acceptedByName: "Again",
    });
    expect(await prisma.project.count({ where: { dealId: deal.id } })).toBe(before);
  });

  it("does not start a second project when another version of the quote is accepted", async () => {
    const deal = await newDeal();
    await acceptedQuoteOn(deal.id);
    await handlers.startProjectFromQuote({
      quoteId: "99999999-9999-4999-8999-999999999999",
      reference: "QT-NEW",
      dealId: deal.id,
      totalMinor: 5,
      currency: "PHP",
      acceptedByName: "Later",
    });
    expect(await prisma.project.count({ where: { dealId: deal.id } })).toBe(1);
  });
});

describe("starting a project by hand", () => {
  it("is for people who may start projects", async () => {
    current = VIEWER;
    const refused = await projects.createProject({
      name: "Nope",
      dealId: "",
      managerId: "",
      budget: "",
      budgetHours: "",
    });
    current = OWNER;
    expect(refused.ok).toBe(false);
  });

  it("needs a name and dates in order, and a readable price and hours", async () => {
    const base = { dealId: "", managerId: "", budget: "", budgetHours: "" };
    expect(await projects.createProject({ ...base, name: " " })).toMatchObject({ ok: false });
    expect(
      await projects.createProject({
        ...base,
        name: "X",
        startDate: "2026-12-10",
        dueDate: "2026-12-01",
      }),
    ).toMatchObject({ ok: false, fieldErrors: { dueDate: expect.any(String) } });
    expect(await projects.createProject({ ...base, name: "X", budget: "lots" })).toMatchObject({
      ok: false,
      fieldErrors: { budget: expect.any(String) },
    });
    expect(await projects.createProject({ ...base, name: "X", budgetHours: "many" })).toMatchObject(
      {
        ok: false,
        fieldErrors: { budgetHours: expect.any(String) },
      },
    );
  });

  it("starts from a won deal, never from one still being worked", async () => {
    const open = await newDeal();
    const refused = await projects.createProject({
      name: "Too early",
      dealId: open.id,
      managerId: "",
      budget: "",
      budgetHours: "",
    });
    expect(refused).toMatchObject({ ok: false, fieldErrors: { dealId: expect.any(String) } });

    const won = await wonDeal();
    const id = await project({ dealId: won.id, name: "From a won deal" });
    const view = await repo.getProject(id);
    expect(view).toMatchObject({ dealId: won.id, status: "planned" });
    expect(view?.clientName).toContain("Client");
    // The manager joined the team.
    expect((await repo.listMembers(id)).map((m) => m.profileId)).toEqual([OWNER.id]);
    // Won deals that already have a project are no longer offered.
    expect((await repo.listDealsReadyForProject()).some((d) => d.id === won.id)).toBe(false);
  });
});

describe("project status", () => {
  it("moves along the allowed paths and completes only when loose ends are tied up", async () => {
    const id = await project({ name: "Status flow" });
    expect(await projects.setProjectStatus(id, "completed")).toMatchObject({ ok: false });
    expect((await projects.setProjectStatus(id, "active")).ok).toBe(true);
    const started = await prisma.project.findUniqueOrThrow({ where: { id } });
    expect(started.startDate).not.toBeNull();

    await work.saveTask({
      projectId: id,
      title: "Ship it",
      assigneeId: "",
      milestoneId: "",
      priority: "normal",
      dueDate: "",
      estimate: "",
    });
    const blocked = await projects.setProjectStatus(id, "completed");
    expect(blocked).toMatchObject({ ok: false });
    expect((blocked as { error: string }).error).toMatch(/1 task is not done/);

    const task = await prisma.projectTask.findFirstOrThrow({ where: { projectId: id } });
    await work.moveTask({ id: task.id, status: "done" });
    expect((await projects.setProjectStatus(id, "completed")).ok).toBe(true);
    expect((await prisma.project.findUniqueOrThrow({ where: { id } })).completedAt).not.toBeNull();
    // A closed project can't be changed, until it is reopened.
    const closed = await work.saveTask({
      projectId: id,
      title: "Late",
      assigneeId: "",
      milestoneId: "",
      priority: "normal",
      dueDate: "",
      estimate: "",
    });
    expect(closed).toMatchObject({ ok: false });
    expect((await projects.setProjectStatus(id, "active")).ok).toBe(true);
    expect((await prisma.project.findUniqueOrThrow({ where: { id } })).completedAt).toBeNull();
  });

  it("deletes only a project that never started and has no hours", async () => {
    const id = await project({ name: "Never mind" });
    expect((await projects.deleteProject(id)).ok).toBe(true);
    expect(await repo.getProject(id)).toBeNull();

    const running = await project({ name: "Running" });
    await projects.setProjectStatus(running, "active");
    expect((await projects.deleteProject(running)).ok).toBe(false);
  });
});

describe("team", () => {
  it("adds people once, keeps the manager, and won't drop someone with open work", async () => {
    const id = await project({ name: "Team rules" });
    expect(
      (await projects.addMember({ projectId: id, profileId: SALES.id, costRate: "350" })).ok,
    ).toBe(true);
    expect(
      await projects.addMember({ projectId: id, profileId: SALES.id, costRate: "" }),
    ).toMatchObject({ ok: false });
    const members = await repo.listMembers(id);
    expect(members.find((m) => m.profileId === SALES.id)?.costRateMinor).toBe(35000);

    const manager = members.find((m) => m.profileId === OWNER.id)!;
    expect(await projects.removeMember(manager.id)).toMatchObject({ ok: false });

    await work.saveTask({
      projectId: id,
      title: "Review",
      assigneeId: SALES.id,
      milestoneId: "",
      priority: "high",
      dueDate: "",
      estimate: "2",
    });
    const blocked = await projects.removeMember(members.find((m) => m.profileId === SALES.id)!.id);
    expect(blocked).toMatchObject({ ok: false });
    expect((blocked as { error: string }).error).toMatch(/Reassign/);
  });
});

describe("milestones", () => {
  it("keeps billable milestones within the price and needs an amount for them", async () => {
    const id = await project({ name: "Billing", budget: "100000" });
    const base = { projectId: id, description: "", dueDate: "" };
    expect(
      await work.saveMilestone({ ...base, name: "Design", billable: true, amount: "" }),
    ).toMatchObject({ ok: false, fieldErrors: { amount: expect.any(String) } });
    expect(
      (await work.saveMilestone({ ...base, name: "Design", billable: true, amount: "60000" })).ok,
    ).toBe(true);
    expect(
      await work.saveMilestone({ ...base, name: "Build", billable: true, amount: "50000" }),
    ).toMatchObject({ ok: false });
    expect(
      (await work.saveMilestone({ ...base, name: "Build", billable: true, amount: "40000" })).ok,
    ).toBe(true);
    // The price can't drop below what milestones already bill.
    expect(
      await projects.updateProject(id, {
        name: "Billing",
        dealId: "",
        managerId: OWNER.id,
        budget: "90000",
        budgetHours: "100",
      }),
    ).toMatchObject({ ok: false, fieldErrors: { budget: expect.any(String) } });
  });

  it("finishes only when its tasks are done, and a finished billable one is kept", async () => {
    const id = await project({ name: "Finishing" });
    const made = await work.saveMilestone({
      projectId: id,
      name: "Launch",
      description: "",
      dueDate: "",
      billable: true,
      amount: "1000",
    });
    const milestoneId = (made as { data: { id: string } }).data.id;
    await work.saveTask({
      projectId: id,
      title: "Deploy",
      milestoneId,
      assigneeId: "",
      priority: "normal",
      dueDate: "",
      estimate: "",
    });
    expect(await work.setMilestoneStatus(milestoneId, "done")).toMatchObject({ ok: false });

    const task = await prisma.projectTask.findFirstOrThrow({ where: { projectId: id } });
    await work.moveTask({ id: task.id, status: "done" });
    expect((await work.setMilestoneStatus(milestoneId, "done")).ok).toBe(true);

    expect(await work.deleteMilestone(milestoneId)).toMatchObject({ ok: false });
    expect(
      await work.saveMilestone({
        id: milestoneId,
        projectId: id,
        name: "Launch",
        description: "",
        dueDate: "",
        billable: true,
        amount: "2000",
      }),
    ).toMatchObject({ ok: false });
    expect((await repo.listMilestones(id))[0]).toMatchObject({
      status: "done",
      tasks: { total: 1, done: 1 },
    });
  });

  it("is refused by the database when a billable milestone has no amount", async () => {
    const id = await project({ name: "DB rule" });
    await expect(
      prisma.milestone.create({ data: { projectId: id, name: "Bad", billable: true } }),
    ).rejects.toThrow();
  });
});

describe("tasks", () => {
  it("assigns only to the team, orders a column, and stamps completion", async () => {
    const id = await project({ name: "Board" });
    const make = async (title: string, assigneeId = "") =>
      work.saveTask({
        projectId: id,
        title,
        assigneeId,
        milestoneId: "",
        priority: "normal",
        dueDate: "",
        estimate: "",
      });

    expect(await make("Outsider", SALES.id)).toMatchObject({
      ok: false,
      fieldErrors: { assigneeId: expect.any(String) },
    });
    const a = (await make("A")) as { data: { id: string } };
    const b = (await make("B")) as { data: { id: string } };
    const c = (await make("C")) as { data: { id: string } };

    // C moves in front of A inside the same column.
    await work.moveTask({ id: c.data.id, status: "todo", beforeId: a.data.id });
    expect((await repo.listTasks(id)).map((t) => t.title)).toEqual(["C", "A", "B"]);

    await work.moveTask({ id: a.data.id, status: "done" });
    const done = (await repo.listTasks(id)).find((t) => t.title === "A")!;
    expect(done.status).toBe("done");
    expect(done.completedAt).toBeTruthy();
    await work.moveTask({ id: a.data.id, status: "review" });
    expect((await repo.listTasks(id)).find((t) => t.title === "A")?.completedAt).toBeUndefined();
    expect(b.data.id).toBeTruthy();
  });

  it("reads an estimate in hours", async () => {
    const id = await project({ name: "Estimates" });
    const base = {
      projectId: id,
      title: "Estimate me",
      assigneeId: "",
      milestoneId: "",
      priority: "normal" as const,
      dueDate: "",
    };
    expect(await work.saveTask({ ...base, estimate: "soon" })).toMatchObject({
      ok: false,
      fieldErrors: { estimate: expect.any(String) },
    });
    expect((await work.saveTask({ ...base, estimate: "1:30" })).ok).toBe(true);
    expect((await repo.listTasks(id))[0].estimateMinutes).toBe(90);
  });
});

describe("time, as the database sees it", () => {
  const entry = (projectId: string, over: Record<string, unknown> = {}) => ({
    projectId,
    profileId: OWNER.id,
    workDate: new Date("2026-11-04T00:00:00Z"),
    weekStart: new Date("2026-11-02T00:00:00Z"),
    minutes: 60,
    ...over,
  });

  it("refuses minutes out of range and a week start that isn't the Monday", async () => {
    const id = await project({ name: "Time rules" });
    await expect(prisma.timeEntry.create({ data: entry(id, { minutes: 0 }) })).rejects.toThrow();
    await expect(prisma.timeEntry.create({ data: entry(id, { minutes: 1441 }) })).rejects.toThrow();
    await expect(
      prisma.timeEntry.create({ data: entry(id, { weekStart: new Date("2026-11-03T00:00:00Z") }) }),
    ).rejects.toThrow();
    expect((await prisma.timeEntry.create({ data: entry(id) })).minutes).toBe(60);
  });

  it("freezes approved time: it can't be edited or deleted", async () => {
    const id = await project({ name: "Frozen time" });
    const created = await prisma.timeEntry.create({ data: entry(id, { status: "approved" }) });
    await expect(
      prisma.timeEntry.update({ where: { id: created.id }, data: { minutes: 90 } }),
    ).rejects.toThrow(/Approved time cannot be changed/);
    await expect(prisma.timeEntry.delete({ where: { id: created.id } })).rejects.toThrow(
      /Approved time cannot be deleted/,
    );
    // Other states stay editable.
    const draft = await prisma.timeEntry.create({ data: entry(id) });
    expect(
      (await prisma.timeEntry.update({ where: { id: draft.id }, data: { minutes: 75 } })).minutes,
    ).toBe(75);
  });

  it("keeps a project with logged time: it can't be deleted from underneath it", async () => {
    const id = await project({ name: "Has hours" });
    await prisma.timeEntry.create({ data: entry(id) });
    expect((await projects.deleteProject(id)).ok).toBe(false);
    await expect(prisma.project.delete({ where: { id } })).rejects.toThrow();
  });
});

describe("the projects list", () => {
  it("shows progress, filters by status and finds by name", async () => {
    const id = await project({ name: "Zebra listing" });
    await work.saveTask({
      projectId: id,
      title: "One",
      assigneeId: "",
      milestoneId: "",
      priority: "normal",
      dueDate: "",
      estimate: "",
    });
    const params = {
      q: "Zebra",
      filters: { status: "", manager: "" },
      sort: "created",
      dir: "desc" as const,
      page: 1,
      pageSize: 10,
    };
    const found = await repo.listProjects(params);
    expect(found.items).toHaveLength(1);
    expect(found.items[0]).toMatchObject({ name: "Zebra listing", tasks: { total: 1, done: 0 } });
    expect(
      (await repo.listProjects({ ...params, filters: { status: "completed", manager: "" } })).items,
    ).toHaveLength(0);
    expect(
      (await repo.listProjects({ ...params, q: "", filters: { status: "", manager: "me" } })).items
        .length,
    ).toBeGreaterThan(0);
  });
});
