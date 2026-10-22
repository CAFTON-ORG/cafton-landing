import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../../../scripts/pglite-setup.mjs";
import { SYSTEM_ROLE_PERMISSIONS, type Permission } from "@/lib/auth/permissions";

/**
 * Catalog and quotes against a real Postgres (PGlite) built from the real migrations: numbering,
 * totals, the approval rule, sending, the public link, e-acceptance and what is frozen afterwards.
 */

const person = (id: string, roleKey: string) => ({
  id,
  name: `${roleKey} ${id.slice(0, 4)}`,
  email: `${roleKey}-${id.slice(0, 4)}@cafton.com`,
  roleKey,
  roleName: roleKey,
  permissions: SYSTEM_ROLE_PERMISSIONS[roleKey as "owner" | "admin"],
});
const OWNER = person("55555555-5555-4555-8555-555555555555", "owner");
const ADMIN = person("66666666-6666-4666-8666-666666666666", "admin");
let current = OWNER;

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ "x-forwarded-for": "203.0.113.9", "user-agent": "TestBrowser/1.0" }),
}));
vi.mock("@/lib/auth/dal", () => ({
  requirePermission: vi.fn(async () => current),
  verifySession: vi.fn(async () => current),
  can: (staff: { permissions: readonly string[] }, permission: Permission) =>
    staff.permissions.includes(permission),
}));

let db: PGlite;
let server: PGLiteSocketServer;
let prisma: typeof import("@/lib/db").prisma;
let quotes: typeof import("./actions/quotes");
let catalog: typeof import("./actions/catalog");
let pub: typeof import("./public");
let repo: typeof import("./repository");
let pdf: typeof import("./pdf/quote-pdf");
let server_: typeof import("./server");
let deals: typeof import("@/features/crm/actions/deals");

const tokenOf = (result: { ok: boolean; data?: unknown }) =>
  (result.data as { link: string }).link.split("/").pop()!;

beforeAll(async () => {
  db = (await createDatabase()) as PGlite;
  server = new PGLiteSocketServer({ db, port: 0, host: "127.0.0.1", maxConnections: 4 });
  await server.start();
  const port = (server as unknown as { server: { address(): { port: number } } }).server.address()
    .port;
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_POOL_MAX = "1";
  for (const user of [OWNER, ADMIN]) {
    await db
      .exec(`INSERT INTO auth.users (id, email) VALUES ('${user.id}', '${user.email}')`)
      .catch(() => undefined);
    await db.exec(
      `INSERT INTO profiles (id, email, full_name, role_id)
       SELECT '${user.id}', '${user.email}', '${user.name}', id FROM roles WHERE key = '${user.roleKey}' ON CONFLICT DO NOTHING`,
    );
  }
  ({ prisma } = await import("@/lib/db"));
  quotes = await import("./actions/quotes");
  catalog = await import("./actions/catalog");
  pub = await import("./public");
  repo = await import("./repository");
  pdf = await import("./pdf/quote-pdf");
  server_ = await import("./server");
  deals = await import("@/features/crm/actions/deals");
}, 120_000);

afterAll(async () => {
  await server?.stop();
  await db?.close();
});

let counter = 0;
async function makeDeal(withEmail = true) {
  counter += 1;
  const contact = await prisma.contact.create({
    data: {
      firstName: "Cora",
      lastName: "Client",
      email: withEmail ? `client-${counter}@example.com` : "",
    },
  });
  const stage = await prisma.pipelineStage.findFirstOrThrow({
    where: { kind: "open", pipeline: { isDefault: true } },
  });
  return prisma.deal.create({
    data: { title: "Inventory system", contactId: contact.id, stageId: stage.id },
  });
}

const line = (price: string, over: Record<string, unknown> = {}) => ({
  description: "Design and build",
  quantity: "1",
  unitLabel: "project",
  price,
  discountPct: 0,
  taxable: true,
  ...over,
});

const inDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

const body = (lines: ReturnType<typeof line>[], over: Record<string, unknown> = {}) => ({
  title: "Inventory system",
  intro: "",
  terms: "Pay 50% to start.",
  paymentTerms: "",
  depositPct: 50,
  validUntil: inDays(30),
  lines,
  ...over,
});

describe("catalog", () => {
  it("adds items, edits them, and keeps those used on a quote", async () => {
    const made = await catalog.saveCatalogItem(null, {
      name: "Website build",
      pricingModel: "fixed",
      price: "150,000.00",
      unitLabel: "project",
      taxable: true,
      active: true,
    });
    expect(made.ok).toBe(true);
    const items = await repo.listCatalog();
    expect(items[0]).toMatchObject({ name: "Website build", unitPriceMinor: 150_000_00 });
    expect(
      (
        await catalog.saveCatalogItem(null, {
          name: "",
          pricingModel: "fixed",
          price: "abc",
          unitLabel: "",
          taxable: true,
          active: true,
        })
      ).ok,
    ).toBe(false);
  });
});

describe("a quote from draft to accepted", () => {
  let dealId: string;
  let quoteId: string;
  let token: string;

  it("numbers a new draft and works out the totals with VAT", async () => {
    const deal = await makeDeal();
    dealId = deal.id;
    const created = await quotes.createQuote(dealId);
    expect(created.ok).toBe(true);
    quoteId = (created as { data: { id: string } }).data.id;
    const draft = await repo.getQuote(quoteId);
    expect(draft).toMatchObject({ version: 1, status: "draft" });
    expect(draft?.reference).toMatch(/^QT-\d{4}-\d{4}$/);

    const saved = await quotes.saveQuote(
      quoteId,
      body([line("100,000.00"), line("50,000.00", { taxable: false })]),
    );
    expect(saved.ok).toBe(true);
    const after = await repo.getQuote(quoteId);
    expect(after).toMatchObject({
      subtotalMinor: 150_000_00,
      taxMinor: 12_000_00,
      totalMinor: 162_000_00,
    });
    expect(after?.lines).toHaveLength(2);
  });

  it("refuses to send a draft, then approves a small quote at once", async () => {
    expect((await quotes.sendQuote(quoteId)).ok).toBe(false);
    const submitted = await quotes.submitQuote(quoteId);
    expect(submitted).toMatchObject({ ok: true, data: { status: "approved" } });
    // Approved quotes are not editable any more.
    expect((await quotes.saveQuote(quoteId, body([line("1")]))).ok).toBe(false);
  });

  it("sends it, makes a secret link and a real PDF", async () => {
    const sent = await quotes.sendQuote(quoteId);
    expect(sent.ok).toBe(true);
    const row = await prisma.quote.findUniqueOrThrow({ where: { id: quoteId } });
    expect(row.status).toBe("sent");
    token = tokenOf(sent);
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    // Only a hash of the link is stored, never the link itself.
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.tokenHash).not.toContain(token);
    expect(row.sentHash).toMatch(/^[0-9a-f]{64}$/);
    // Sending moved the early deal to Proposal.
    const moved = await prisma.deal.findUniqueOrThrow({
      where: { id: dealId },
      include: { stage: true },
    });
    expect(moved.stage.name).toBe("Proposal");
    const view = await repo.getPublicQuote(token);
    expect(view?.recipientName).toBe("Cora Client");
    expect(JSON.stringify(view)).not.toContain("@example.com");
    const file = await pdf.renderQuotePdf(view!, {
      name: "CAFTON",
      email: "hello@cafton.com",
      place: "Baguio City, Philippines",
    });
    expect(file.subarray(0, 4).toString()).toBe("%PDF");
    expect(await repo.getPublicQuote("x".repeat(43))).toBeNull();
  });

  it("records the client's acceptance and freezes the quote", async () => {
    expect(
      (
        await pub.respondToQuote({
          action: "accept",
          token,
          name: "Cora Client",
          email: "",
          agreed: false as never,
        })
      ).ok,
    ).toBe(false);
    const accepted = await pub.respondToQuote({
      action: "accept",
      token,
      name: "Cora Client",
      email: "",
      agreed: true,
    });
    expect(accepted).toMatchObject({ ok: true, data: { status: "accepted" } });

    const row = await prisma.quote.findUniqueOrThrow({ where: { id: quoteId } });
    expect(row).toMatchObject({
      status: "accepted",
      acceptedByName: "Cora Client",
      acceptedIp: "203.0.113.9",
      acceptedUserAgent: "TestBrowser/1.0",
    });
    expect(Number(row.acceptedTotalMinor)).toBe(162_000_00);
    expect(row.acceptedHash).toBe(row.sentHash);
    expect(
      (await prisma.deal.findUniqueOrThrow({ where: { id: dealId }, include: { stage: true } }))
        .stage.name,
    ).toBe("Negotiation");
    // The deal's value follows the accepted quote, and the timeline and audit log say so.
    expect(
      Number((await prisma.deal.findUniqueOrThrow({ where: { id: dealId } })).amountMinor),
    ).toBe(162_000_00);
    expect(
      await prisma.activity.count({
        where: { dealId, body: { contains: "accepted by Cora Client" } },
      }),
    ).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: "quote.accept" } })).toBe(1);

    // Answering twice, editing, and revising an accepted quote are all refused.
    expect(
      (await pub.respondToQuote({ action: "decline", token, reason: "changed my mind" })).ok,
    ).toBe(false);
    await expect(
      prisma.quote.update({
        where: { id: quoteId },
        data: { totalMinor: BigInt(1), subtotalMinor: BigInt(1), taxMinor: BigInt(0) },
      }),
    ).rejects.toThrow();
    await expect(prisma.quoteLine.deleteMany({ where: { quoteId } })).rejects.toThrow();
    expect((await quotes.reviseQuote(quoteId)).ok).toBe(false);
    expect((await quotes.deleteQuote(quoteId)).ok).toBe(false);
  });
});

describe("approval, revisions and declining", () => {
  it("asks for a second person above the limit", async () => {
    const deal = await makeDeal();
    current = ADMIN;
    const { data } = (await quotes.createQuote(deal.id)) as { data: { id: string } };
    await quotes.saveQuote(data.id, body([line("500,000.00")]));
    expect(await quotes.submitQuote(data.id)).toMatchObject({
      ok: true,
      data: { status: "pending_approval" },
    });
    // You cannot approve what you wrote (unless you are an Owner)...
    expect((await quotes.approveQuote(data.id)).ok).toBe(false);
    expect((await quotes.sendQuote(data.id)).ok).toBe(false);
    // ...but an Owner can.
    current = OWNER;
    expect((await quotes.approveQuote(data.id)).ok).toBe(true);
    expect((await prisma.quote.findUniqueOrThrow({ where: { id: data.id } })).approvedBy).toBe(
      OWNER.id,
    );
  });

  it("sends a quote back with a reason", async () => {
    const deal = await makeDeal();
    current = ADMIN;
    const { data } = (await quotes.createQuote(deal.id)) as { data: { id: string } };
    await quotes.saveQuote(data.id, body([line("400,000.00")]));
    await quotes.submitQuote(data.id);
    current = OWNER;
    expect((await quotes.rejectQuote(data.id, "")).ok).toBe(false);
    expect((await quotes.rejectQuote(data.id, "Add the maintenance plan")).ok).toBe(true);
    expect((await prisma.quote.findUniqueOrThrow({ where: { id: data.id } })).status).toBe("draft");
  });

  it("revises a sent quote into version 2, and the old link says it was replaced", async () => {
    const deal = await makeDeal();
    const { data } = (await quotes.createQuote(deal.id)) as { data: { id: string } };
    await quotes.saveQuote(data.id, body([line("20,000.00")]));
    await quotes.submitQuote(data.id);
    const firstToken = tokenOf(await quotes.sendQuote(data.id));
    const first = await prisma.quote.findUniqueOrThrow({ where: { id: data.id } });
    const revised = await quotes.reviseQuote(data.id);
    expect(revised.ok).toBe(true);
    const next = await prisma.quote.findUniqueOrThrow({
      where: { id: (revised as { data: { id: string } }).data.id },
      include: { lines: true },
    });
    expect(next).toMatchObject({ reference: first.reference, version: 2, status: "draft" });
    expect(next.lines).toHaveLength(1);
    expect((await prisma.quote.findUniqueOrThrow({ where: { id: data.id } })).status).toBe(
      "superseded",
    );
    expect((await repo.getPublicQuote(firstToken))?.status).toBe("superseded");
    expect(
      (
        await pub.respondToQuote({
          action: "accept",
          token: firstToken,
          name: "Late Client",
          email: "",
          agreed: true,
        })
      ).ok,
    ).toBe(false);
    // Only the newest version can be sent.
    expect((await quotes.sendQuote(data.id)).ok).toBe(false);
  });

  it("lets a client decline with a reason, once", async () => {
    const deal = await makeDeal();
    const { data } = (await quotes.createQuote(deal.id)) as { data: { id: string } };
    await quotes.saveQuote(data.id, body([line("30,000.00")]));
    await quotes.submitQuote(data.id);
    const token = tokenOf(await quotes.sendQuote(data.id));
    expect((await pub.respondToQuote({ action: "decline", token, reason: "" })).ok).toBe(false);
    expect(
      await pub.respondToQuote({ action: "decline", token, reason: "Over budget" }),
    ).toMatchObject({ ok: true, data: { status: "declined" } });
    expect((await prisma.quote.findUniqueOrThrow({ where: { id: data.id } })).declinedReason).toBe(
      "Over budget",
    );
  });

  it("will not send to a contact with no email", async () => {
    const deal = await makeDeal(false);
    const { data } = (await quotes.createQuote(deal.id)) as { data: { id: string } };
    await quotes.saveQuote(data.id, body([line("10,000.00")]));
    await quotes.submitQuote(data.id);
    expect(await quotes.sendQuote(data.id)).toMatchObject({ ok: false });
  });

  it("deletes a draft, but not a sent quote", async () => {
    const deal = await makeDeal();
    const { data } = (await quotes.createQuote(deal.id)) as { data: { id: string } };
    expect((await quotes.deleteQuote(data.id)).ok).toBe(true);
    const made = (await quotes.createQuote(deal.id)) as { data: { id: string } };
    await quotes.saveQuote(made.data.id, body([line("10,000.00")]));
    await quotes.submitQuote(made.data.id);
    await quotes.sendQuote(made.data.id);
    expect((await quotes.deleteQuote(made.data.id)).ok).toBe(false);
  });
});

describe("business rules around a quote", () => {
  async function sentQuote(price = "20,000.00") {
    const deal = await makeDeal();
    const { data } = (await quotes.createQuote(deal.id)) as { data: { id: string } };
    await quotes.saveQuote(data.id, body([line(price)]));
    await quotes.submitQuote(data.id);
    const sent = await quotes.sendQuote(data.id);
    return { deal, id: data.id, sent };
  }

  it("allows one live quote per deal", async () => {
    const deal = await makeDeal();
    expect((await quotes.createQuote(deal.id)).ok).toBe(true);
    expect(await quotes.createQuote(deal.id)).toMatchObject({ ok: false });
  });

  it("asks for approval on a deep discount even when the total is small", async () => {
    const deal = await makeDeal();
    const { data } = (await quotes.createQuote(deal.id)) as { data: { id: string } };
    await quotes.saveQuote(data.id, body([line("20,000.00", { discountPct: 20 })]));
    expect(await quotes.submitQuote(data.id)).toMatchObject({
      ok: true,
      data: { status: "pending_approval" },
    });
  });

  it("refuses a bad validity date and an impossible deposit", async () => {
    const deal = await makeDeal();
    const { data } = (await quotes.createQuote(deal.id)) as { data: { id: string } };
    expect(
      (await quotes.saveQuote(data.id, body([line("1,000.00")], { depositPct: 150 }))).ok,
    ).toBe(false);
    await quotes.saveQuote(data.id, body([line("1,000.00")], { validUntil: inDays(200) }));
    expect(await quotes.submitQuote(data.id)).toMatchObject({ ok: false });
  });

  it("withdraws a sent quote with a reason, and its link says so", async () => {
    const { id, sent } = await sentQuote();
    const token = tokenOf(sent);
    expect((await quotes.withdrawQuote(id, "")).ok).toBe(false);
    expect((await quotes.withdrawQuote(id, "Scope changed")).ok).toBe(true);
    expect((await repo.getPublicQuote(token))?.status).toBe("withdrawn");
    expect(
      (
        await pub.respondToQuote({
          action: "accept",
          token,
          name: "Cora Client",
          email: "",
          agreed: true,
        })
      ).ok,
    ).toBe(false);
  });

  it("makes a new link on request and kills the old one", async () => {
    const { id, sent } = await sentQuote();
    const old = tokenOf(sent);
    const fresh = await quotes.renewQuoteLink(id);
    expect(fresh.ok).toBe(true);
    expect(await repo.getPublicQuote(old)).toBeNull();
    expect(await repo.getPublicQuote(tokenOf(fresh))).not.toBeNull();
  });

  it("refuses acceptance when the stored content no longer matches what was sent", async () => {
    const { id, sent } = await sentQuote();
    const token = tokenOf(sent);
    await db.exec(`ALTER TABLE quotes DISABLE TRIGGER USER`);
    await db.exec(`UPDATE quotes SET title = 'Tampered' WHERE id = '${id}'`);
    await db.exec(`ALTER TABLE quotes ENABLE TRIGGER USER`);
    expect(
      await pub.respondToQuote({
        action: "accept",
        token,
        name: "Cora Client",
        email: "",
        agreed: true,
      }),
    ).toMatchObject({ ok: false });
  });

  it("withdraws live quotes when the deal is lost, and blocks deleting a deal with quotes", async () => {
    const { deal, id, sent } = await sentQuote();
    expect((await deals.deleteDeal(deal.id)).ok).toBe(false);
    expect((await deals.loseDeal(deal.id, "Went elsewhere")).ok).toBe(true);
    expect((await prisma.quote.findUniqueOrThrow({ where: { id } })).status).toBe("withdrawn");
    expect((await repo.getPublicQuote(tokenOf(sent)))?.status).toBe("withdrawn");
    // No new quotes on a lost deal.
    expect(await quotes.createQuote(deal.id)).toMatchObject({ ok: false });
  });

  it("wins a deal at the accepted quote's total", async () => {
    const { deal, sent } = await sentQuote("40,000.00");
    await pub.respondToQuote({
      action: "accept",
      token: tokenOf(sent),
      name: "Cora Client",
      email: "",
      agreed: true,
    });
    expect((await deals.winDeal(deal.id, "1.00")).ok).toBe(false);
    expect((await deals.winDeal(deal.id)).ok).toBe(true);
    expect(
      Number((await prisma.deal.findUniqueOrThrow({ where: { id: deal.id } })).amountMinor),
    ).toBe(44_800_00);
  });

  it("expires a sent quote once its date has passed", async () => {
    const { id } = await sentQuote();
    await db.exec(`ALTER TABLE quotes DISABLE TRIGGER USER`);
    await db.exec(`UPDATE quotes SET valid_until = '2020-01-01' WHERE id = '${id}'`);
    await db.exec(`ALTER TABLE quotes ENABLE TRIGGER USER`);
    expect(await server_.expireDueQuotes()).toBeGreaterThanOrEqual(1);
    expect((await prisma.quote.findUniqueOrThrow({ where: { id } })).status).toBe("expired");
  });
});
