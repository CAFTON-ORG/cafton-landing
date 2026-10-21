import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../../../scripts/pglite-setup.mjs";
import { SYSTEM_ROLE_PERMISSIONS } from "@/lib/auth/permissions";

/**
 * The whole CRM against a real Postgres (PGlite) built from the real migrations:
 * website form -> lead -> qualify -> convert -> deal -> win/lose/reopen, with the
 * audit log and timeline checked along the way. Only the framework edges are
 * replaced: the session (always an owner) and Next's cache invalidation.
 */

const OWNER = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Olivia Owner",
  email: "olivia@cafton.com",
  roleKey: "owner",
  roleName: "Owner",
  permissions: SYSTEM_ROLE_PERMISSIONS.owner,
};

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/auth/dal", () => ({
  requirePermission: vi.fn(async () => OWNER),
  verifySession: vi.fn(async () => OWNER),
}));

let db: PGlite;
let server: PGLiteSocketServer;

type Modules = {
  intake: typeof import("./intake");
  leads: typeof import("./actions/leads");
  deals: typeof import("./actions/deals");
  contacts: typeof import("./actions/contacts");
  activity: typeof import("./actions/activity");
  leadRepo: typeof import("./repository/leads");
  dealRepo: typeof import("./repository/deals");
  pipeline: typeof import("./repository/pipeline");
};
let m: Modules;

const form = (overrides: Record<string, unknown> = {}) => ({
  firstName: "Ada",
  lastName: "Lovelace",
  email: "Ada@Example.com",
  phone: "+639171234567",
  buildingFor: "An existing business",
  businessName: "Analytical Engines Ltd",
  industry: "Technology",
  industryOther: "",
  position: "Owner / Founder",
  positionOther: "",
  businessSize: "2-10 employees",
  yearsOperating: "1-3 years",
  officeAddress: "Baguio City",
  challenges: ["Our tools don't talk to each other"],
  challengesOther: "",
  goalsCategory: "operations",
  goals: ["Inventory"],
  budget: "₱100k - ₱500k",
  timeline: "1-3 months",
  referralSource: "Search engine",
  notes: "Need this before Q1.",
  ...overrides,
});

const tableParams = (extra: Record<string, string> = {}) => ({
  q: "",
  filters: {},
  sort: "created",
  dir: "desc" as const,
  page: 1,
  pageSize: 25,
  ...extra,
});

beforeAll(async () => {
  db = (await createDatabase()) as PGlite;
  server = new PGLiteSocketServer({ db, port: 0, host: "127.0.0.1", maxConnections: 4 });
  await server.start();
  const port = (server as unknown as { server: { address(): { port: number } } }).server.address().port;

  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_POOL_MAX = "1";

  // The OWNER must exist as a profile for foreign keys used by `ownerId`.
  await db.exec(`INSERT INTO auth.users (id, email) VALUES ('${OWNER.id}', '${OWNER.email}')`).catch(() => undefined);
  await db.exec(
    `INSERT INTO profiles (id, email, full_name, role_id)
     SELECT '${OWNER.id}', '${OWNER.email}', '${OWNER.name}', id FROM roles WHERE key = 'owner'
     ON CONFLICT DO NOTHING`,
  );

  m = {
    intake: await import("./intake"),
    leads: await import("./actions/leads"),
    deals: await import("./actions/deals"),
    contacts: await import("./actions/contacts"),
    activity: await import("./actions/activity"),
    leadRepo: await import("./repository/leads"),
    dealRepo: await import("./repository/deals"),
    pipeline: await import("./repository/pipeline"),
  };
}, 120_000);

afterAll(async () => {
  await server?.stop();
  await db?.close();
});

describe("website enquiry to won deal", () => {
  let leadId: string;
  let dealId: string;

  it("stores a form submission as a lead with a first timeline entry and a reply task", async () => {
    const result = await m.intake.createLeadFromWebsite(form() as never, {
      leadSource: "Contact Us Page",
      pageName: "Contact",
      pagePath: "/contact",
    });
    expect(result).toMatchObject({ ok: true });

    const page = await m.leadRepo.listLeads(tableParams());
    expect(page.items).toHaveLength(1);
    const lead = page.items[0];
    leadId = lead.id;
    expect(lead).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
      businessName: "Analytical Engines Ltd",
      status: "new",
      source: "Contact Us Page",
    });
    expect(lead.reference).toMatch(/^LD-\d{4}-\d{4}$/);

    const { rows: tasks } = await db.query<{ title: string; assignee_id: string | null }>(
      "SELECT title, assignee_id FROM tasks WHERE lead_id = $1",
      [leadId],
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toContain("Reply to Ada Lovelace");
    const { rows: activity } = await db.query("SELECT 1 FROM activities WHERE lead_id = $1", [leadId]);
    expect(activity).toHaveLength(1);
  });

  it("qualifies, refuses to qualify twice, and refuses to disqualify without a reason", async () => {
    expect(await m.leads.qualifyLead(leadId)).toMatchObject({ ok: true });
    expect(await m.leads.qualifyLead(leadId)).toMatchObject({ ok: false, error: expect.stringMatching(/already/) });
    expect(await m.leads.disqualifyLead(leadId, "  ")).toMatchObject({ ok: false });
  });

  it("converts the lead into a contact, an organization and a deal in Discovery", async () => {
    const result = await m.leads.convertLead(leadId, { amount: "250,000" });
    expect(result.ok).toBe(true);
    dealId = (result as { data: { dealId: string } }).data.dealId;

    const deal = await m.dealRepo.getDeal(dealId);
    expect(deal).toMatchObject({
      stageKey: "discovery", // a qualified lead starts further along
      amountMinor: 25_000_000,
      contactName: "Ada Lovelace",
      organizationName: "Analytical Engines Ltd",
      source: "website",
    });

    const detail = await m.leadRepo.getLead(leadId);
    expect(detail?.lead).toMatchObject({ status: "converted", dealId });
    expect(await m.leads.convertLead(leadId)).toMatchObject({ ok: false, error: expect.stringMatching(/already/) });
  });

  it("reuses the existing contact when the same person writes in again", async () => {
    await m.intake.createLeadFromWebsite(form({ email: "ADA@example.com", businessName: "" }) as never, {
      leadSource: "Homepage",
      pageName: "Home",
      pagePath: "/",
    });
    const second = (await m.leadRepo.listLeads(tableParams({ q: "ada" }))).items.find((l) => l.status === "new");
    expect(second?.contactId).toBeTruthy(); // linked on arrival

    const converted = await m.leads.convertLead(second!.id);
    expect(converted.ok).toBe(true);
    const { rows } = await db.query("SELECT 1 FROM contacts WHERE lower(email) = 'ada@example.com' AND deleted_at IS NULL");
    expect(rows).toHaveLength(1);
  });

  it("moves an open deal, but not to Won or Lost directly", async () => {
    const stages = await m.pipeline.listStages();
    const proposal = stages.find((s) => s.key === "proposal")!;
    const won = stages.find((s) => s.key === "won")!;
    expect(await m.deals.moveDeal(dealId, proposal.id)).toMatchObject({ ok: true });
    expect(await m.deals.moveDeal(dealId, won.id)).toMatchObject({ ok: false, error: expect.stringMatching(/Mark as won/) });
  });

  it("wins the deal, locks its value, and blocks tasks, deletion and moves on the closed deal", async () => {
    expect(await m.deals.winDeal(dealId, "300000")).toMatchObject({ ok: true });
    const deal = await m.dealRepo.getDeal(dealId);
    expect(deal).toMatchObject({ stageKind: "won", amountMinor: 30_000_000 });
    expect(deal?.wonAt).toBeTruthy();

    const edit = await m.deals.updateDeal(dealId, {
      title: deal!.title,
      contactId: deal!.contactId,
      amount: "999",
    });
    expect(edit).toMatchObject({ ok: false, error: expect.stringMatching(/locked/) });
    expect(await m.deals.deleteDeal(dealId)).toMatchObject({ ok: false, error: expect.stringMatching(/can't be deleted/) });
    expect(
      await m.activity.createTask({ title: "Too late", subject: { dealId } }),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/closed/) });
  });

  it("reopens a won deal, then loses it with a reason, completing its open tasks", async () => {
    expect(await m.deals.reopenDeal(dealId)).toMatchObject({ ok: true });
    expect((await m.dealRepo.getDeal(dealId))?.stageKey).toBe("negotiation");

    expect(await m.activity.createTask({ title: "Chase signature", subject: { dealId } })).toMatchObject({ ok: true });
    expect(await m.deals.loseDeal(dealId, "")).toMatchObject({ ok: false });
    expect(await m.deals.loseDeal(dealId, "Went with a competitor")).toMatchObject({ ok: true });

    const { rows } = await db.query<{ done_at: string | null }>("SELECT done_at FROM tasks WHERE deal_id = $1", [dealId]);
    expect(rows.every((row) => row.done_at !== null)).toBe(true);
    expect(await m.deals.winDeal(dealId, "1")).toMatchObject({ ok: false, error: expect.stringMatching(/Reopen/) });
  });

  it("keeps a timeline of every stage change and writes an audit row for each action", async () => {
    const { rows: timeline } = await db.query<{ body: string }>(
      "SELECT body FROM activities WHERE deal_id = $1 ORDER BY created_at",
      [dealId],
    );
    const text = timeline.map((row) => row.body).join("\n");
    expect(text).toContain("Created from website enquiry");
    expect(text).toContain("Moved from Discovery to Proposal");
    expect(text).toContain("Won at");
    expect(text).toContain("Reopened in Negotiation");
    expect(text).toContain("Lost: Went with a competitor");

    const { rows: audit } = await db.query<{ action: string }>("SELECT action FROM audit_log");
    const actions = new Set(audit.map((row) => row.action));
    for (const expected of ["lead.create", "lead.qualify", "lead.convert", "deal.move", "deal.win", "deal.reopen", "deal.lose"]) {
      expect(actions).toContain(expected);
    }
  });
});

describe("contacts and organizations", () => {
  it("rejects a duplicate email and protects a contact that still has deals", async () => {
    const dup = await m.contacts.createContact({
      firstName: "Ada",
      lastName: "Clone",
      email: "ada@example.com",
    });
    expect(dup).toMatchObject({ ok: false, fieldErrors: { email: expect.stringMatching(/already exists/) } });

    const { rows } = await db.query<{ id: string }>("SELECT id FROM contacts WHERE lower(email) = 'ada@example.com'");
    expect(await m.contacts.deleteContact(rows[0].id)).toMatchObject({ ok: false, error: expect.stringMatching(/deal/) });
  });

  it("reports pipeline totals without counting closed deals", async () => {
    const forecast = await m.pipeline.getForecast();
    expect(forecast.openCount).toBe(1); // the second converted lead's deal; the first is lost
    expect(forecast.currency).toBe("PHP");
    expect(forecast.lostThisMonthCount).toBe(1);
  });
});
