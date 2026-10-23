import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PGlite } from "@electric-sql/pglite";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../../../scripts/pglite-setup.mjs";
import { SYSTEM_ROLE_PERMISSIONS, type Permission } from "@/lib/auth/permissions";

/**
 * Tags, bulk actions, merge, CSV import, pipelines, notes, saved views and activity summaries,
 * against a real Postgres (PGlite) built from the real migrations. Only the session and Next's
 * cache invalidation are replaced.
 */

const OWNER = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Olivia Owner",
  email: "olivia-extras@cafton.com",
  roleKey: "owner",
  roleName: "Owner",
  permissions: SYSTEM_ROLE_PERMISSIONS.owner,
};
const OTHER = "33333333-3333-4333-8333-333333333333";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
// The mail service: tests decide what it answers, and can see what was sent.
vi.mock("@/lib/mail", async (original) => ({
  ...(await original<typeof import("@/lib/mail")>()),
  sendMail: vi.fn(async () => ({ ok: true as const, id: "test-mail" })),
}));
vi.mock("@/lib/auth/dal", () => ({
  requirePermission: vi.fn(async () => OWNER),
  verifySession: vi.fn(async () => OWNER),
  getStaff: vi.fn(async () => OWNER as unknown),
  can: (staff: { permissions: readonly string[] }, permission: Permission) =>
    staff.permissions.includes(permission),
}));

/** Supabase Storage replaced by an in-memory bucket the tests can inspect and make fail. */
const bucket = vi.hoisted(() => ({
  objects: new Map<string, { data: Buffer; contentType: string }>(),
  failUpload: false,
  failRemove: false,
}));
vi.mock("@/lib/supabase/admin", () => ({
  isAdminStorageConfigured: true,
  createAdminClient: () => ({
    storage: {
      from: (name: string) => ({
        upload: async (path: string, data: Buffer, options: { contentType: string }) => {
          if (bucket.failUpload) return { error: { message: "boom" } };
          bucket.objects.set(`${name}/${path}`, { data, contentType: options.contentType });
          return { error: null };
        },
        remove: async (paths: string[]) => {
          if (bucket.failRemove) return { error: { message: "boom" } };
          for (const path of paths) bucket.objects.delete(`${name}/${path}`);
          return { error: null };
        },
        createSignedUrl: async (
          path: string,
          seconds: number,
          options?: { download?: string },
        ) => ({
          data: {
            signedUrl: `https://signed.example/${name}/${path}?t=${seconds}&d=${options?.download ?? ""}`,
          },
          error: null,
        }),
      }),
    },
  }),
}));

let db: PGlite;
let server: PGLiteSocketServer;
let prisma: typeof import("@/lib/db").prisma;
let tags: typeof import("./actions/tags");
let bulk: typeof import("./actions/bulk");
let merge: typeof import("./actions/merge");
let imp: typeof import("./actions/import");
let pipelines: typeof import("./actions/pipelines");
let deals: typeof import("./actions/deals");
let notes: typeof import("./actions/notes");
let activity: typeof import("./actions/activity");
let views: typeof import("./actions/views");
let pipelineRepo: typeof import("./repository/pipeline");
let summary: typeof import("./repository/summary");
let tagRepo: typeof import("./repository/tags");
let duplicates: typeof import("./repository/duplicates");
let leadRepo: typeof import("./repository/leads");
let intake: typeof import("./intake");
let emailActions: typeof import("./actions/email");
let fileActions: typeof import("./actions/files");
let fieldActions: typeof import("./actions/custom-fields");
let fieldRepo: typeof import("./repository/custom-fields");
let fileRoute: typeof import("@/app/api/crm/files/[id]/route");
let dal: typeof import("@/lib/auth/dal");
let mail: typeof import("@/lib/mail");
let userActions: typeof import("../users/actions");
let scoringJobs: typeof import("./scoring-jobs");

beforeAll(async () => {
  db = (await createDatabase()) as PGlite;
  server = new PGLiteSocketServer({ db, port: 0, host: "127.0.0.1", maxConnections: 4 });
  await server.start();
  const port = (server as unknown as { server: { address(): { port: number } } }).server.address()
    .port;
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_POOL_MAX = "1";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test";

  for (const [id, email] of [
    [OWNER.id, OWNER.email],
    [OTHER, "other-extras@cafton.com"],
  ]) {
    await db
      .exec(`INSERT INTO auth.users (id, email) VALUES ('${id}', '${email}')`)
      .catch(() => undefined);
    await db.exec(
      `INSERT INTO profiles (id, email, full_name, role_id)
       SELECT '${id}', '${email}', '${email}', id FROM roles WHERE key = 'owner' ON CONFLICT DO NOTHING`,
    );
  }

  ({ prisma } = await import("@/lib/db"));
  tags = await import("./actions/tags");
  bulk = await import("./actions/bulk");
  merge = await import("./actions/merge");
  imp = await import("./actions/import");
  pipelines = await import("./actions/pipelines");
  deals = await import("./actions/deals");
  notes = await import("./actions/notes");
  activity = await import("./actions/activity");
  views = await import("./actions/views");
  pipelineRepo = await import("./repository/pipeline");
  summary = await import("./repository/summary");
  tagRepo = await import("./repository/tags");
  duplicates = await import("./repository/duplicates");
  leadRepo = await import("./repository/leads");
  intake = await import("./intake");
  emailActions = await import("./actions/email");
  fileActions = await import("./actions/files");
  fieldActions = await import("./actions/custom-fields");
  fieldRepo = await import("./repository/custom-fields");
  fileRoute = await import("@/app/api/crm/files/[id]/route");
  dal = await import("@/lib/auth/dal");
  mail = await import("@/lib/mail");
  userActions = await import("../users/actions");
  scoringJobs = await import("./scoring-jobs");
}, 120_000);

afterAll(async () => {
  await server?.stop();
  await db?.close();
});

const contact = (n: number, extra: Record<string, unknown> = {}) =>
  prisma.contact.create({
    data: { firstName: `First${n}`, lastName: `Last${n}`, email: `c${n}@example.com`, ...extra },
  });

describe("tags", () => {
  it("cleans tags, saves them and offers them as suggestions", async () => {
    const c = await contact(1);
    const result = await tags.setTags({
      kind: "contact",
      id: c.id,
      tags: [" VIP ", "vip", "Follow  Up"],
    });
    expect(result).toMatchObject({ ok: true, data: { tags: ["vip", "follow up"] } });
    expect(await tagRepo.listTagOptions("contact")).toContain("follow up");
  });
});

describe("bulk actions", () => {
  it("assigns, tags, and keeps what the rules protect", async () => {
    const a = await contact(2);
    const b = await contact(3);
    const stage = await prisma.pipelineStage.findFirstOrThrow({
      where: { kind: "open", pipeline: { isDefault: true } },
    });
    await prisma.deal.create({ data: { title: "Busy", contactId: b.id, stageId: stage.id } });

    const assigned = await bulk.bulkAssign({ kind: "contact", ids: [a.id, b.id], ownerId: OTHER });
    expect(assigned).toMatchObject({ ok: true, data: { done: 2, skipped: 0 } });
    expect((await prisma.contact.findUniqueOrThrow({ where: { id: a.id } })).ownerId).toBe(OTHER);
    // The person it was assigned to is told; the person who did it is not.
    const told = await prisma.notification.findMany({
      where: { userId: OTHER, kind: "contact.assigned" },
    });
    expect(told.length).toBeGreaterThan(0);

    await bulk.bulkTag({ kind: "contact", ids: [a.id, b.id], add: ["Warm"], remove: [] });
    expect((await prisma.contact.findUniqueOrThrow({ where: { id: a.id } })).tags).toContain(
      "warm",
    );

    const deleted = await bulk.bulkDelete({ kind: "contact", ids: [a.id, b.id] });
    expect(deleted).toMatchObject({ ok: true, data: { done: 1, skipped: 1 } });
    expect(
      (await prisma.contact.findUniqueOrThrow({ where: { id: a.id } })).deletedAt,
    ).not.toBeNull();
    expect((await prisma.contact.findUniqueOrThrow({ where: { id: b.id } })).deletedAt).toBeNull();
  });
});

describe("merging duplicates", () => {
  it("moves everything to the kept contact and removes the others", async () => {
    const keep = await contact(10, { phone: "0917 555 0000" });
    const dupe = await contact(11, { phone: "+63 917 555 0000", position: "CEO", tags: ["lead"] });
    const stage = await prisma.pipelineStage.findFirstOrThrow({
      where: { kind: "open", pipeline: { isDefault: true } },
    });
    const deal = await prisma.deal.create({
      data: { title: "Theirs", contactId: dupe.id, stageId: stage.id },
    });
    await prisma.activity.create({
      data: { type: "note", body: "hello", contactId: dupe.id, createdByName: "x" },
    });

    const groups = await duplicates.listDuplicateContacts();
    expect(
      groups.some(
        (g) => g.members.some((m) => m.id === keep.id) && g.members.some((m) => m.id === dupe.id),
      ),
    ).toBe(true);

    const merged = await merge.mergeContacts({ primaryId: keep.id, otherIds: [dupe.id] });
    expect(merged.ok).toBe(true);
    expect((await prisma.deal.findUniqueOrThrow({ where: { id: deal.id } })).contactId).toBe(
      keep.id,
    );
    const kept = await prisma.contact.findUniqueOrThrow({ where: { id: keep.id } });
    expect(kept.position).toBe("CEO");
    expect(kept.tags).toContain("lead");
    expect(
      (await prisma.contact.findUniqueOrThrow({ where: { id: dupe.id } })).deletedAt,
    ).not.toBeNull();
    expect(await prisma.activity.count({ where: { contactId: keep.id } })).toBeGreaterThanOrEqual(
      2,
    );
    expect(await prisma.auditLog.count({ where: { action: "contact.merge" } })).toBe(1);
  });

  it("refuses to merge a contact into itself", async () => {
    const c = await contact(12);
    expect((await merge.mergeContacts({ primaryId: c.id, otherIds: [c.id] })).ok).toBe(false);
  });
});

describe("merging leads", () => {
  const lead = (n: number, extra: Record<string, unknown> = {}) =>
    prisma.lead.create({
      data: {
        firstName: `Lead${n}`,
        lastName: "Merge",
        email: `lead-merge-${n}@example.com`,
        answers: {},
        ...extra,
      },
    });

  it("moves the timeline, tasks and meetings to the kept lead and removes the others", async () => {
    const keep = await lead(1, { tags: ["a"] });
    const dupe = await lead(2, {
      phone: "0917 777 0000",
      budget: "500k",
      status: "qualified",
      tags: ["b"],
    });
    await prisma.activity.create({
      data: { type: "note", body: "from the dupe", leadId: dupe.id, createdByName: "x" },
    });
    await prisma.task.create({ data: { title: "Call back", leadId: dupe.id } });

    const merged = await merge.mergeLeads({ primaryId: keep.id, otherIds: [dupe.id] });
    expect(merged.ok).toBe(true);

    const kept = await prisma.lead.findUniqueOrThrow({ where: { id: keep.id } });
    expect(kept).toMatchObject({ phone: "0917 777 0000", budget: "500k", status: "qualified" });
    expect([...kept.tags].sort()).toEqual(["a", "b"]);
    expect(
      (await prisma.lead.findUniqueOrThrow({ where: { id: dupe.id } })).deletedAt,
    ).not.toBeNull();
    expect(await prisma.activity.count({ where: { leadId: keep.id } })).toBeGreaterThanOrEqual(2);
    expect(await prisma.task.count({ where: { leadId: keep.id, title: "Call back" } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: "lead.merge" } })).toBe(1);
  });

  it("finds a repeat enquiry by email, and never offers a converted lead", async () => {
    const first = await lead(3, { email: "same-lead-person@example.com" });
    const again = await lead(4, { email: "Same-Lead-Person@example.com" });
    const converted = await lead(5, { email: "same-lead-person@example.com", status: "converted" });
    const groups = await duplicates.listDuplicateLeads();
    const group = groups.find((g) => g.members.some((m) => m.id === first.id));
    expect(group?.members.map((m) => m.id).sort()).toEqual([first.id, again.id].sort());
    expect(group?.members.some((m) => m.id === converted.id)).toBe(false);
  });

  it("refuses to merge a converted lead, or a lead into itself", async () => {
    const a = await lead(6);
    const converted = await lead(7, { status: "converted" });
    expect(await merge.mergeLeads({ primaryId: a.id, otherIds: [converted.id] })).toMatchObject({
      ok: false,
    });
    expect(await merge.mergeLeads({ primaryId: a.id, otherIds: [a.id] })).toMatchObject({
      ok: false,
    });
    expect(
      (await prisma.lead.findUniqueOrThrow({ where: { id: converted.id } })).deletedAt,
    ).toBeNull();
  });
});

describe("lead scoring", () => {
  const make = (n: number, extra: Record<string, unknown> = {}) =>
    prisma.lead.create({
      data: {
        firstName: `Score${n}`,
        lastName: "Lead",
        email: `score-${n}@acme.ph`,
        answers: {},
        ...extra,
      },
    });
  const list = (filters: Record<string, string> = {}, sort = "score") =>
    leadRepo.listLeads({ q: "", filters, sort, dir: "desc", page: 1, pageSize: 100 });

  it("scores leads that have no score yet, then leaves them alone", async () => {
    const strong = await make(1, {
      budget: "₱500,000+",
      timeline: "As soon as possible",
      phone: "0917 000 0000",
      businessName: "Acme",
      answers: {
        businessSize: "51-200 employees",
        position: "Owner / Founder",
        referralSource: "Existing client",
      },
    });
    const weak = await make(2, { budget: "Not sure yet", timeline: "Just exploring for now" });
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: strong.id } })).score).toBeNull();

    expect(await scoringJobs.scoreUnscoredLeads()).toBeGreaterThanOrEqual(2);
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: strong.id } })).score).toBe(96);
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: weak.id } })).score).toBe(10);
    expect(await scoringJobs.scoreUnscoredLeads()).toBe(0);
  });

  it("filters by band (cold also takes unscored leads) and sorts by score", async () => {
    const unscored = await make(3);
    const hot = await list({ band: "hot" });
    expect(hot.items.length).toBeGreaterThan(0);
    expect(hot.items.every((lead) => lead.scoreBand === "hot")).toBe(true);

    const cold = await list({ band: "cold" });
    expect(cold.items.some((lead) => lead.id === unscored.id)).toBe(true);
    expect(cold.items.every((lead) => lead.scoreBand === "cold")).toBe(true);

    const all = await list();
    const scores = all.items.map((lead) => lead.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("explains a score on the lead itself, even before it is stored", async () => {
    const unscored = await make(4, { budget: "₱500,000+" });
    const view = (await list()).items.find((lead) => lead.id === unscored.id)!;
    expect(view.score).toBeGreaterThanOrEqual(30);
    expect(view.scoreReasons[0]).toMatchObject({ label: "Budget: ₱500,000+", points: 30 });
  });
});

describe("round-robin lead assignment", () => {
  const VIEWER = "44444444-4444-4444-8444-444444444444";
  const form = (n: number) =>
    ({
      firstName: "Round",
      lastName: `Robin${n}`,
      email: `round-robin-${n}@example.com`,
      phone: "",
      buildingFor: "A new idea or startup",
      businessName: "",
      industry: "",
      industryOther: "",
      position: "",
      positionOther: "",
      businessSize: "",
      yearsOperating: "",
      officeAddress: "",
      challenges: [],
      challengesOther: "",
      goalsCategory: "operations",
      goals: [],
      budget: "",
      timeline: "",
      referralSource: "",
      notes: "",
    }) as never;
  const submit = (n: number) =>
    intake.createLeadFromWebsite(form(n), {
      leadSource: "Contact Us Page",
      pageName: "Contact",
      pagePath: "/contact",
    });
  const ownerOf = async (n: number) =>
    (await prisma.lead.findFirstOrThrow({ where: { email: `round-robin-${n}@example.com` } }))
      .ownerId;

  it("leaves an enquiry unassigned until someone is chosen", async () => {
    expect(await submit(1)).toMatchObject({ ok: true });
    expect(await ownerOf(1)).toBeNull();
  });

  it("rotates new enquiries between the people in the turn order, and tells the one it picks", async () => {
    expect((await userActions.setTakesLeads("olivia-extras@cafton.com", true)).ok).toBe(true);
    expect((await userActions.setTakesLeads("other-extras@cafton.com", true)).ok).toBe(true);

    for (const n of [2, 3, 4, 5]) expect(await submit(n)).toMatchObject({ ok: true });
    const owners = await Promise.all([2, 3, 4, 5].map(ownerOf));
    expect(new Set(owners)).toEqual(new Set([OWNER.id, OTHER]));
    const counts = owners.reduce<Record<string, number>>(
      (all, id) => ({ ...all, [id!]: (all[id!] ?? 0) + 1 }),
      {},
    );
    expect(Math.abs(counts[OWNER.id] - counts[OTHER])).toBeLessThanOrEqual(0);

    const lead = await prisma.lead.findFirstOrThrow({
      where: { email: "round-robin-5@example.com" },
    });
    expect(
      await prisma.activity.count({
        where: { leadId: lead.id, body: { startsWith: "Assigned to" } },
      }),
    ).toBe(1);
    expect((await prisma.task.findFirstOrThrow({ where: { leadId: lead.id } })).assigneeId).toBe(
      lead.ownerId,
    );
    expect(
      await prisma.notification.count({
        where: {
          userId: lead.ownerId!,
          kind: "lead.assigned",
          href: `/dashboard/crm/leads/${lead.id}`,
        },
      }),
    ).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: "user.leads" } })).toBe(2);
  });

  it("stops assigning to someone taken off the turn order", async () => {
    expect((await userActions.setTakesLeads("other-extras@cafton.com", false)).ok).toBe(true);
    for (const n of [6, 7]) await submit(n);
    expect(await ownerOf(6)).toBe(OWNER.id);
    expect(await ownerOf(7)).toBe(OWNER.id);
  });

  it("won't put in someone whose role can't work on leads, or who has not signed in", async () => {
    await db
      .exec(`INSERT INTO auth.users (id, email) VALUES ('${VIEWER}', 'viewer-extras@cafton.com')`)
      .catch(() => undefined);
    await db.exec(
      `INSERT INTO profiles (id, email, full_name, role_id)
       SELECT '${VIEWER}', 'viewer-extras@cafton.com', 'Vera Viewer', id FROM roles WHERE key = 'viewer'
       ON CONFLICT DO NOTHING`,
    );
    const refused = await userActions.setTakesLeads("viewer-extras@cafton.com", true);
    expect(refused).toMatchObject({ ok: false });
    expect((refused as { error: string }).error).toMatch(/can't work on leads/);
    expect(await userActions.setTakesLeads("nobody-extras@cafton.com", true)).toMatchObject({
      ok: false,
    });
  });
});

describe("emailing from a record", () => {
  const sendMail = () => vi.mocked(mail.sendMail);

  it("sends to the lead's address, replies to the sender, and keeps it on the timeline", async () => {
    const lead = await prisma.lead.create({
      data: { firstName: "Mail", lastName: "Lead", email: "mail-lead@example.com", answers: {} },
    });
    sendMail().mockClear();
    const result = await emailActions.sendRecordEmail({
      subject: "Next steps",
      body: "Thanks for getting in touch.",
      to: { leadId: lead.id },
    });
    expect(result.ok).toBe(true);
    expect(sendMail()).toHaveBeenCalledTimes(1);
    expect(sendMail().mock.calls[0][0]).toMatchObject({
      to: "mail-lead@example.com",
      subject: "Next steps",
      replyTo: OWNER.email,
    });
    expect(sendMail().mock.calls[0][0].text).toContain("Thanks for getting in touch.");

    const entry = await prisma.activity.findFirstOrThrow({
      where: { leadId: lead.id, type: "email" },
    });
    expect(entry.body).toContain("Subject: Next steps");
    expect(entry.body).toContain("mail-lead@example.com");
    expect(
      await prisma.auditLog.count({ where: { action: "email.send", entityId: lead.id } }),
    ).toBe(1);
  });

  it("reaches a deal's contact, and a contact directly", async () => {
    const person = await contact(140);
    const stage = await prisma.pipelineStage.findFirstOrThrow({
      where: { kind: "open", pipeline: { isDefault: true } },
    });
    const deal = await prisma.deal.create({
      data: { title: "Mail deal", contactId: person.id, stageId: stage.id },
    });
    sendMail().mockClear();
    expect(
      (await emailActions.sendRecordEmail({ subject: "Hi", body: "Deal", to: { dealId: deal.id } }))
        .ok,
    ).toBe(true);
    expect(
      (
        await emailActions.sendRecordEmail({
          subject: "Hi",
          body: "Contact",
          to: { contactId: person.id },
        })
      ).ok,
    ).toBe(true);
    expect(sendMail().mock.calls.map((call) => call[0].to)).toEqual([person.email, person.email]);
    expect(await prisma.activity.count({ where: { dealId: deal.id, type: "email" } })).toBe(1);
  });

  it("logs nothing when the mail service did not take the message", async () => {
    const lead = await prisma.lead.create({
      data: { firstName: "No", lastName: "Mail", email: "no-mail@example.com", answers: {} },
    });
    sendMail().mockResolvedValueOnce({ ok: false, reason: "not-configured" });
    const refused = await emailActions.sendRecordEmail({
      subject: "Hi",
      body: "Hello",
      to: { leadId: lead.id },
    });
    expect(refused).toMatchObject({ ok: false });
    expect((refused as { error: string }).error).toMatch(/nothing was sent/i);
    expect(await prisma.activity.count({ where: { leadId: lead.id, type: "email" } })).toBe(0);
    expect(
      await prisma.auditLog.count({ where: { action: "email.send", entityId: lead.id } }),
    ).toBe(0);
  });

  it("refuses an empty message, a multi-line subject, and a record that is gone", async () => {
    const lead = await prisma.lead.create({
      data: { firstName: "Bad", lastName: "Input", email: "bad-input@example.com", answers: {} },
    });
    sendMail().mockClear();
    const to = { leadId: lead.id };
    expect(await emailActions.sendRecordEmail({ subject: "", body: "x", to })).toMatchObject({
      ok: false,
    });
    expect(await emailActions.sendRecordEmail({ subject: "a", body: "", to })).toMatchObject({
      ok: false,
    });
    expect(
      await emailActions.sendRecordEmail({ subject: "a\nBcc: boss@example.com", body: "x", to }),
    ).toMatchObject({ ok: false });
    expect(
      await emailActions.sendRecordEmail({
        subject: "a",
        body: "x",
        to: { leadId: "00000000-0000-4000-8000-000000000000" },
      }),
    ).toMatchObject({ ok: false });
    expect(sendMail()).not.toHaveBeenCalled();
  });
});

describe("files on records", () => {
  const SALES = {
    ...OWNER,
    id: OTHER,
    name: "Sam Sales",
    email: "other-extras@cafton.com",
    roleKey: "sales",
    permissions: SYSTEM_ROLE_PERMISSIONS.sales,
  };
  const pdf = () => Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n");
  const formFor = (subject: Record<string, string>, name: string, bytes: Buffer, type = "") => {
    const body = new FormData();
    body.set("file", new File([new Uint8Array(bytes)], name, { type }));
    for (const [key, value] of Object.entries(subject)) body.set(key, value);
    return body;
  };
  const newLead = (n: number) =>
    prisma.lead.create({
      data: {
        firstName: `File${n}`,
        lastName: "Lead",
        email: `file-lead-${n}@example.com`,
        answers: {},
      },
    });
  const rows = (leadId: string) => prisma.recordFile.findMany({ where: { leadId } });

  it("stores a PDF privately under a random name, and records it on the timeline and audit log", async () => {
    const lead = await newLead(1);
    const result = await fileActions.uploadRecordFile(
      formFor({ leadId: lead.id }, "My Brief (final).pdf", pdf(), "application/pdf"),
    );
    expect(result).toMatchObject({ ok: true, data: { name: "My Brief (final).pdf" } });
    const [row] = await rows(lead.id);
    expect(row.path).toMatch(/^crm\/[0-9a-f-]{36}\.pdf$/);
    expect(row.path).not.toContain("Brief");
    expect(row).toMatchObject({ mime: "application/pdf", uploadedByName: OWNER.name });
    expect(bucket.objects.get(`crm-files/${row.path}`)?.data.equals(pdf())).toBe(true);
    expect(
      await prisma.activity.count({
        where: { leadId: lead.id, body: "Added the file My Brief (final).pdf" },
      }),
    ).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: "file.add", entityId: lead.id } })).toBe(
      1,
    );
  });

  it("re-encodes an image, so metadata never reaches storage", async () => {
    const lead = await newLead(2);
    const exif = await sharp({
      create: { width: 40, height: 30, channels: 3, background: "#336699" },
    })
      .jpeg()
      .withExif({ IFD0: { Copyright: "secret-camera-owner" } })
      .toBuffer();
    expect(exif.toString("latin1")).toContain("secret-camera-owner");
    expect(
      (
        await fileActions.uploadRecordFile(
          formFor({ leadId: lead.id }, "site.jpeg", exif, "image/jpeg"),
        )
      ).ok,
    ).toBe(true);
    const [row] = await rows(lead.id);
    expect(row.path.endsWith(".jpg")).toBe(true);
    const stored = bucket.objects.get(`crm-files/${row.path}`)!.data;
    expect(stored.toString("latin1")).not.toContain("secret-camera-owner");
    expect((await sharp(stored).metadata()).width).toBe(40);
  });

  it("refuses a disguised program, a web page, an empty file and an oversized one, storing nothing", async () => {
    const lead = await newLead(3);
    const before = bucket.objects.size;
    const attempts: [string, Buffer][] = [
      ["invoice.pdf", Buffer.from("MZ\u0090\u0000 this is a program")],
      ["page.html", Buffer.from("<script>alert(1)</script>")],
      ["logo.svg", Buffer.from("<svg onload=alert(1)/>")],
      ["empty.pdf", Buffer.alloc(0)],
      ["huge.pdf", Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(4 * 1024 * 1024)])],
    ];
    for (const [name, bytes] of attempts) {
      const result = await fileActions.uploadRecordFile(formFor({ leadId: lead.id }, name, bytes));
      expect(result.ok, name).toBe(false);
    }
    expect(await rows(lead.id)).toHaveLength(0);
    expect(bucket.objects.size).toBe(before);
  });

  it("stops at the limit per record", async () => {
    const lead = await newLead(4);
    await prisma.recordFile.createMany({
      data: Array.from({ length: 50 }, (_, i) => ({
        leadId: lead.id,
        path: `crm/00000000-0000-4000-8000-${String(i).padStart(12, "0")}.txt`,
        name: `f${i}.txt`,
        mime: "text/plain",
        sizeBytes: 5,
        uploadedByName: "x",
      })),
    });
    const refused = await fileActions.uploadRecordFile(
      formFor({ leadId: lead.id }, "one-more.pdf", pdf()),
    );
    expect(refused).toMatchObject({ ok: false });
    expect((refused as { error: string }).error).toMatch(/50 files/);
  });

  it("leaves no row when storage fails, and keeps the row when removal fails", async () => {
    const lead = await newLead(5);
    bucket.failUpload = true;
    expect(
      (await fileActions.uploadRecordFile(formFor({ leadId: lead.id }, "a.pdf", pdf()))).ok,
    ).toBe(false);
    bucket.failUpload = false;
    expect(await rows(lead.id)).toHaveLength(0);

    await fileActions.uploadRecordFile(formFor({ leadId: lead.id }, "b.pdf", pdf()));
    const [row] = await rows(lead.id);
    bucket.failRemove = true;
    expect((await fileActions.deleteRecordFile(row.id)).ok).toBe(false);
    bucket.failRemove = false;
    expect(await rows(lead.id)).toHaveLength(1);
    expect((await fileActions.deleteRecordFile(row.id)).ok).toBe(true);
    expect(await rows(lead.id)).toHaveLength(0);
    expect(bucket.objects.has(`crm-files/${row.path}`)).toBe(false);
    expect(
      await prisma.auditLog.count({ where: { action: "file.remove", entityId: lead.id } }),
    ).toBe(1);
  });

  it("lets the uploader or an administrator remove a file, and no one else", async () => {
    const lead = await newLead(6);
    await fileActions.uploadRecordFile(formFor({ leadId: lead.id }, "owned.pdf", pdf()));
    const [row] = await rows(lead.id);

    // Another salesperson, not an administrator and not the uploader.
    vi.mocked(dal.requirePermission).mockResolvedValueOnce(SALES as never);
    const refused = await fileActions.deleteRecordFile(row.id);
    expect(refused).toMatchObject({ ok: false });
    expect((refused as { error: string }).error).toMatch(/administrator/);
    expect(await rows(lead.id)).toHaveLength(1);

    // An administrator (the owner here) can.
    expect((await fileActions.deleteRecordFile(row.id)).ok).toBe(true);
  });

  it("keeps a file on an organization, which has no timeline", async () => {
    const org = await prisma.organization.create({ data: { name: "Files Org" } });
    expect(
      (
        await fileActions.uploadRecordFile(
          formFor({ organizationId: org.id }, "terms.txt", Buffer.from("hello")),
        )
      ).ok,
    ).toBe(true);
    const [row] = await prisma.recordFile.findMany({ where: { organizationId: org.id } });
    expect(row).toMatchObject({ mime: "text/plain", leadId: null, dealId: null });
  });

  it("opens a file only through a short-lived signed link, for people who may see the record", async () => {
    const lead = await newLead(7);
    await fileActions.uploadRecordFile(formFor({ leadId: lead.id }, "Contract v2.pdf", pdf()));
    const [row] = await rows(lead.id);
    const get = (id: string) =>
      fileRoute.GET(new Request("http://x"), { params: Promise.resolve({ id }) });

    const ok = await get(row.id);
    expect(ok.status).toBe(302);
    const location = ok.headers.get("location")!;
    expect(location).toContain(`crm-files/${row.path}`);
    expect(location).toContain("t=60");
    // Offered as a download under the name people recognise, never displayed in the page.
    expect(decodeURIComponent(location)).toContain("d=Contract v2.pdf");
    expect(ok.headers.get("cache-control")).toContain("no-store");

    vi.mocked(dal.getStaff).mockResolvedValueOnce(null as never);
    expect((await get(row.id)).status).toBe(401);
    vi.mocked(dal.getStaff).mockResolvedValueOnce({ ...OWNER, permissions: [] } as never);
    expect((await get(row.id)).status).toBe(403);
    expect((await get("not-an-id")).status).toBe(404);
    expect((await get("00000000-0000-4000-8000-000000000000")).status).toBe(404);
  });
});

describe("custom fields", () => {
  const field = (over: Record<string, unknown> = {}) =>
    fieldActions.saveCustomField({
      entity: "lead",
      label: "Preferred region",
      type: "text",
      options: [],
      ...over,
    } as never);
  const keyOf = (result: Awaited<ReturnType<typeof field>>) =>
    (result as { data: { key: string } }).data.key;
  const lead = (n: number) =>
    prisma.lead.create({
      data: {
        firstName: `Cf${n}`,
        lastName: "Lead",
        email: `cf-lead-${n}@example.com`,
        answers: {},
      },
    });
  const customOf = async (id: string) =>
    (await prisma.lead.findUniqueOrThrow({ where: { id } })).custom;

  it("adds fields with stable keys, and refuses a bad list or a type change", async () => {
    const first = await field();
    expect(first.ok).toBe(true);
    expect(keyOf(first)).toBe("preferred_region");
    // The same wording again gets its own key, never the first one's.
    expect(keyOf(await field())).toBe("preferred_region_2");

    expect(await field({ label: "Tier", type: "select", options: ["Gold"] })).toMatchObject({
      ok: false,
    });
    expect(await field({ label: "  " })).toMatchObject({ ok: false });

    const id = (first as { data: { id: string } }).data.id;
    expect(
      await fieldActions.saveCustomField({
        id,
        entity: "lead",
        label: "Region",
        type: "number",
        options: [],
      }),
    ).toMatchObject({ ok: false });
    // Renaming keeps the key, so stored values stay attached.
    const renamed = await fieldActions.saveCustomField({
      id,
      entity: "lead",
      label: "Region of interest",
      type: "text",
      options: [],
    });
    expect(keyOf(renamed)).toBe("preferred_region");
    expect(
      await prisma.auditLog.count({ where: { action: "custom_field.create" } }),
    ).toBeGreaterThanOrEqual(2);
  });

  it("saves, validates and clears values on a record, and ignores anything that is not a field", async () => {
    await field({ label: "Seats", type: "number" });
    await field({ label: "Tier", type: "select", options: ["Gold", "Silver"] });
    const record = await lead(1);

    expect(
      (
        await fieldActions.setCustomValues({
          entity: "lead",
          id: record.id,
          values: { preferred_region: "Luzon", seats: "1,200", tier: "Gold", injected: "x" },
        })
      ).ok,
    ).toBe(true);
    expect(await customOf(record.id)).toEqual({
      preferred_region: "Luzon",
      seats: 1200,
      tier: "Gold",
    });

    const refused = await fieldActions.setCustomValues({
      entity: "lead",
      id: record.id,
      values: { seats: "many", tier: "Bronze", preferred_region: "Visayas" },
    });
    expect(refused).toMatchObject({
      ok: false,
      fieldErrors: { seats: "Enter a number.", tier: "Pick one of the choices." },
    });
    // Nothing was half-saved.
    expect(await customOf(record.id)).toEqual({
      preferred_region: "Luzon",
      seats: 1200,
      tier: "Gold",
    });

    expect(
      (await fieldActions.setCustomValues({ entity: "lead", id: record.id, values: { tier: "" } }))
        .ok,
    ).toBe(true);
    expect(await customOf(record.id)).toEqual({ preferred_region: "Luzon", seats: 1200 });
    expect(
      await prisma.auditLog.count({ where: { action: "lead.custom", entityId: record.id } }),
    ).toBe(2);
  });

  it("keeps an archived field's values, hides it from forms, and brings it back", async () => {
    const made = await field({ label: "Legacy code", type: "text" });
    const id = (made as { data: { id: string } }).data.id;
    const record = await lead(2);
    await fieldActions.setCustomValues({
      entity: "lead",
      id: record.id,
      values: { legacy_code: "A-1" },
    });

    expect((await fieldActions.setCustomFieldActive(id, false)).ok).toBe(true);
    expect((await fieldRepo.listCustomFields("lead")).some((f) => f.key === "legacy_code")).toBe(
      false,
    );
    expect(
      (await fieldRepo.listCustomFields("lead", { includeArchived: true })).some(
        (f) => f.key === "legacy_code",
      ),
    ).toBe(true);
    // The value is still there, but an archived field can't be written to.
    await fieldActions.setCustomValues({
      entity: "lead",
      id: record.id,
      values: { legacy_code: "B-2" },
    });
    expect(await customOf(record.id)).toMatchObject({ legacy_code: "A-1" });

    expect((await fieldActions.setCustomFieldActive(id, true)).ok).toBe(true);
    expect((await fieldRepo.listCustomFields("lead")).some((f) => f.key === "legacy_code")).toBe(
      true,
    );
  });

  it("limits how many fields a kind of record can have", async () => {
    await prisma.customField.createMany({
      data: Array.from({ length: 25 }, (_, i) => ({
        entity: "deal",
        key: `bulk_${i}`,
        label: `Bulk ${i}`,
        type: "text",
        position: i,
      })),
    });
    const refused = await field({ entity: "deal", label: "One too many" });
    expect(refused).toMatchObject({ ok: false });
    expect((refused as { error: string }).error).toMatch(/limit of 25/);
  });

  it("carries custom values and files to the kept record when contacts are merged", async () => {
    const keep = await contact(150, { custom: { a: 1 } });
    const dupe = await contact(151, { custom: { a: 2, b: 3 } });
    await prisma.recordFile.create({
      data: {
        contactId: dupe.id,
        path: "crm/11111111-1111-4111-8111-111111111111.txt",
        name: "notes.txt",
        mime: "text/plain",
        sizeBytes: 5,
        uploadedByName: "x",
      },
    });
    expect((await merge.mergeContacts({ primaryId: keep.id, otherIds: [dupe.id] })).ok).toBe(true);
    expect((await prisma.contact.findUniqueOrThrow({ where: { id: keep.id } })).custom).toEqual({
      a: 1,
      b: 3,
    });
    expect(await prisma.recordFile.count({ where: { contactId: keep.id } })).toBe(1);
    expect(await prisma.recordFile.count({ where: { contactId: dupe.id } })).toBe(0);
  });
});

describe("CSV import", () => {
  const csv =
    "Name,Email,Company,Tags\nAda Lovelace,ada-import@example.com,Import Co,vip\nBad Row,not-an-email,,\nAda Again,ADA-import@example.com,,\n";

  it("previews without writing, then imports, then skips what exists", async () => {
    const preview = await imp.importCsv({ kind: "contacts", csv, dryRun: true });
    expect(preview).toMatchObject({ ok: true, data: { preview: true, created: 1, existing: 1 } });
    expect(await prisma.contact.count({ where: { email: "ada-import@example.com" } })).toBe(0);

    const done = await imp.importCsv({ kind: "contacts", csv, dryRun: false });
    expect(done).toMatchObject({ ok: true, data: { created: 1, organizationsCreated: 1 } });
    const row = await prisma.contact.findFirstOrThrow({
      where: { email: "ada-import@example.com" },
      include: { organization: true },
    });
    expect(row.organization?.name).toBe("Import Co");
    expect(row.tags).toEqual(["vip"]);
    expect(row.source).toBe("import");

    const again = await imp.importCsv({ kind: "contacts", csv, dryRun: false });
    expect(again).toMatchObject({ ok: true, data: { created: 0 } });
  });

  it("explains a file it cannot read", async () => {
    const result = await imp.importCsv({
      kind: "contacts",
      csv: "name,phone\nAda,1\n",
      dryRun: true,
    });
    expect(result).toMatchObject({ ok: true, data: { problems: [{ line: 1 }] } });
  });
});

describe("pipelines", () => {
  it("keeps a deal inside its own pipeline and protects busy stages", async () => {
    const created = await pipelines.createPipeline({ name: "Partnerships" });
    expect(created.ok).toBe(true);
    const all = await pipelineRepo.listPipelines();
    const partnerships = all.find((p) => p.name === "Partnerships")!;
    expect(partnerships.isDefault).toBe(false);
    expect(partnerships.stages.map((s) => s.kind)).toEqual(["open", "open", "open", "won", "lost"]);
    expect(new Set(all.flatMap((p) => p.stages.map((s) => s.key))).size).toBe(
      all.flatMap((p) => p.stages).length,
    );

    const c = await contact(20);
    const made = await deals.createDeal({
      title: "Partner deal",
      contactId: c.id,
      pipelineId: partnerships.id,
      ownerId: "none",
      organizationId: "none",
      amount: "1000",
      expectedCloseDate: "",
      description: "",
    });
    expect(made.ok).toBe(true);
    const deal = await prisma.deal.findFirstOrThrow({
      where: { title: "Partner deal" },
      include: { stage: true },
    });
    expect(deal.stage.pipelineId).toBe(partnerships.id);

    const foreign = (await pipelineRepo.listStages()).find((s) => s.kind === "open")!;
    expect(await deals.moveDeal(deal.id, foreign.id)).toMatchObject({ ok: false });

    expect(await pipelines.deleteStage(deal.stageId)).toMatchObject({ ok: false });
    expect(await pipelines.deletePipeline(partnerships.id)).toMatchObject({ ok: false });

    // Adding a stage lands before Won, and the order stays numbered.
    await pipelines.addStage({ pipelineId: partnerships.id, name: "Intro call", probability: 15 });
    const after = (await pipelineRepo.listPipelines()).find((p) => p.id === partnerships.id)!;
    expect(after.stages.map((s) => s.kind)).toEqual([
      "open",
      "open",
      "open",
      "open",
      "won",
      "lost",
    ]);
    expect(after.stages.map((s) => s.position)).toEqual([1, 2, 3, 4, 5, 6]);

    expect(await pipelines.setDefaultPipeline(partnerships.id)).toMatchObject({ ok: true });
    const defaults = (await pipelineRepo.listPipelines()).filter((p) => p.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe(partnerships.id);
    await pipelines.setDefaultPipeline(
      (await pipelineRepo.listPipelines()).find((p) => p.key === "sales")!.id,
    );
  });
});

describe("notes", () => {
  it("lets the author edit, anyone pin, and keeps a record of deletion", async () => {
    const c = await contact(30);
    await activity.addActivity({ type: "note", body: "First", subject: { contactId: c.id } });
    const note = await prisma.activity.findFirstOrThrow({
      where: { contactId: c.id, type: "note" },
    });
    // Someone else wrote it: not yours to edit.
    await prisma.activity.update({ where: { id: note.id }, data: { createdBy: OTHER } });
    expect((await notes.editNote({ id: note.id, body: "Edited" })).ok).toBe(false);
    await prisma.activity.update({ where: { id: note.id }, data: { createdBy: OWNER.id } });
    expect((await notes.editNote({ id: note.id, body: "Edited" })).ok).toBe(true);
    expect((await notes.pinNote(note.id, true)).ok).toBe(true);
    const row = await prisma.activity.findUniqueOrThrow({ where: { id: note.id } });
    expect(row).toMatchObject({ body: "Edited", pinned: true });
    expect(row.editedAt).not.toBeNull();
    expect((await notes.deleteNote(note.id)).ok).toBe(true);
    expect(await prisma.auditLog.count({ where: { action: "activity.delete" } })).toBe(1);

    const system = await prisma.activity.create({
      data: { type: "system", body: "auto", contactId: c.id, createdByName: "System" },
    });
    expect((await notes.editNote({ id: system.id, body: "no" })).ok).toBe(false);
  });
});

describe("saved views", () => {
  it("saves a search without its page number and lists it back", async () => {
    expect(
      (
        await views.saveView({
          resource: "leads",
          name: "New mine",
          query: "status=new&owner=me&page=3",
          shared: true,
        })
      ).ok,
    ).toBe(true);
    const list = await views.listSavedViews("leads");
    expect(list).toMatchObject({
      ok: true,
      data: [{ name: "New mine", query: "status=new&owner=me", shared: true, mine: true }],
    });
    expect(
      (await views.saveView({ resource: "leads", name: "Empty", query: "page=2", shared: false }))
        .ok,
    ).toBe(false);
  });
});

describe("last contact and next step", () => {
  it("reports when someone last wrote and the soonest thing to do", async () => {
    const c = await contact(40);
    await prisma.activity.create({
      data: { type: "call", body: "rang", contactId: c.id, createdByName: "x" },
    });
    await prisma.activity.create({
      data: { type: "system", body: "ignored", contactId: c.id, createdByName: "x" },
    });
    const soon = new Date(Date.now() + 2 * 86_400_000);
    const later = new Date(Date.now() + 9 * 86_400_000);
    await prisma.task.create({ data: { title: "Later", contactId: c.id, dueAt: later } });
    await prisma.task.create({ data: { title: "Soon", contactId: c.id, dueAt: soon } });
    const map = await summary.activitySummary("contact", [c.id]);
    const found = map.get(c.id)!;
    expect(found.lastContactedAt).toBeDefined();
    expect(new Date(found.nextActivityAt!).getTime()).toBe(soon.getTime());
    const none = await contact(41);
    expect((await summary.activitySummary("contact", [none.id])).get(none.id)).toBeUndefined();
  });
});
