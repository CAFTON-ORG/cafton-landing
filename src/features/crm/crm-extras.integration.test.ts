import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PGlite } from "@electric-sql/pglite";
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
vi.mock("@/lib/auth/dal", () => ({
  requirePermission: vi.fn(async () => OWNER),
  verifySession: vi.fn(async () => OWNER),
  can: (staff: { permissions: readonly string[] }, permission: Permission) =>
    staff.permissions.includes(permission),
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

beforeAll(async () => {
  db = (await createDatabase()) as PGlite;
  server = new PGLiteSocketServer({ db, port: 0, host: "127.0.0.1", maxConnections: 4 });
  await server.start();
  const port = (server as unknown as { server: { address(): { port: number } } }).server.address()
    .port;
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_POOL_MAX = "1";

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
