import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../../../scripts/pglite-setup.mjs";
import { SYSTEM_ROLE_PERMISSIONS, type Permission } from "@/lib/auth/permissions";

/**
 * Contracts, templates, targets and the sales overview against a real Postgres (PGlite) built from
 * the real migrations: drafting from a template, the rules, sending, the public link, e-signature,
 * the freeze triggers, and how a lost deal closes everything off.
 */

const person = (id: string, roleKey: string) => ({
  id,
  name: `${roleKey} ${id.slice(0, 4)}`,
  email: `${roleKey}-${id.slice(0, 4)}@cafton.com`,
  roleKey,
  roleName: roleKey,
  permissions: SYSTEM_ROLE_PERMISSIONS[roleKey as "owner" | "sales"],
});
const OWNER = person("55555555-5555-4555-8555-555555555555", "owner");
const SALES = person("77777777-7777-4777-8777-777777777777", "sales");
let current = OWNER;

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ "x-forwarded-for": "203.0.113.20", "user-agent": "TestBrowser/2.0" }),
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
let targets: typeof import("@/features/sales/actions/targets");
let overview: typeof import("@/features/sales/overview");
let contracts: typeof import("./actions/contracts");
let templates: typeof import("./actions/templates");
let pub: typeof import("./public");
let repo: typeof import("./repository");
let pdf: typeof import("./pdf/contract-pdf");
let server_: typeof import("./server");
let deals: typeof import("@/features/crm/actions/deals");

const tokenOf = (result: unknown) =>
  (result as { data: { link: string } }).data.link.split("/").pop() as string;
const inDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

beforeAll(async () => {
  db = (await createDatabase()) as PGlite;
  server = new PGLiteSocketServer({ db, port: 0, host: "127.0.0.1", maxConnections: 4 });
  await server.start();
  const port = (server as unknown as { server: { address(): { port: number } } }).server.address()
    .port;
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_POOL_MAX = "1";
  for (const user of [OWNER, SALES]) {
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
  targets = await import("@/features/sales/actions/targets");
  overview = await import("@/features/sales/overview");
  contracts = await import("./actions/contracts");
  templates = await import("./actions/templates");
  pub = await import("./public");
  repo = await import("./repository");
  pdf = await import("./pdf/contract-pdf");
  server_ = await import("./server");
  deals = await import("@/features/crm/actions/deals");
}, 120_000);

afterAll(async () => {
  await server?.stop();
  await db?.close();
});

let counter = 0;
/** A deal whose quote the client has already accepted, ready for a contract. */
async function dealWithAcceptedQuote(options: { email?: boolean } = {}) {
  counter += 1;
  const contact = await prisma.contact.create({
    data: {
      firstName: "Cora",
      lastName: "Client",
      email: `contract-client-${counter}@example.com`,
    },
  });
  const stage = await prisma.pipelineStage.findFirstOrThrow({
    where: { kind: "open", pipeline: { isDefault: true } },
    orderBy: { position: "asc" },
  });
  const deal = await prisma.deal.create({
    data: { title: "Inventory system", contactId: contact.id, stageId: stage.id },
  });
  const made = (await quotes.createQuote(deal.id)) as { data: { id: string } };
  await quotes.saveQuote(made.data.id, {
    title: "Inventory system",
    intro: "",
    terms: "",
    paymentTerms: "Bank transfer.",
    depositPct: 50,
    taxRatePct: 12, // this test works with a VAT quote; a new quote starts without VAT
    validUntil: inDays(30),
    lines: [
      {
        description: "Design and build",
        quantity: "1",
        unitLabel: "project",
        price: "100,000.00",
        discountPct: 0,
        taxable: true,
      },
    ],
  });
  await quotes.submitQuote(made.data.id);
  const sent = await quotes.sendQuote(made.data.id);
  await quotePublic.respondToQuote({
    action: "accept",
    token: tokenOf(sent),
    name: "Cora Client",
    email: "",
    agreed: true,
  });
  // The contact can lose their email after the quote was accepted.
  if (options.email === false) {
    await prisma.contact.update({ where: { id: contact.id }, data: { email: "" } });
  }
  return { deal, quoteId: made.data.id };
}

const template = async (kind: "contract" | "sow") =>
  prisma.contractTemplate.findFirstOrThrow({ where: { kind, active: true } });

describe("contract templates", () => {
  it("ships starter templates and refuses unknown merge fields", async () => {
    expect((await repo.listTemplates()).map((t) => t.kind).sort()).toEqual(["contract", "sow"]);
    const bad = await templates.saveTemplate(null, {
      name: "Oops",
      kind: "contract",
      body: "Hello {{nonsense}}",
      active: true,
    });
    expect(bad).toMatchObject({ ok: false });
    const good = await templates.saveTemplate(null, {
      name: "Mini NDA",
      kind: "contract",
      body: "NDA between {{company_name}} and {{client_name}}.",
      active: true,
    });
    expect(good.ok).toBe(true);
  });

  it("keeps a template that was used and deletes one that was not", async () => {
    const mini = await prisma.contractTemplate.findFirstOrThrow({ where: { name: "Mini NDA" } });
    expect((await templates.deleteTemplate(mini.id)).ok).toBe(true);
    const { deal, quoteId } = await dealWithAcceptedQuote();
    const used = await template("contract");
    await contracts.createContract(deal.id, used.id, quoteId);
    expect((await templates.deleteTemplate(used.id)).ok).toBe(false);
  });

  it("is only for people allowed to manage templates", async () => {
    current = SALES;
    const result = await templates.saveTemplate(null, {
      name: "Sneaky",
      kind: "contract",
      body: "x",
      active: true,
    });
    current = OWNER;
    expect(result.ok).toBe(false);
  });
});

describe("a contract from draft to signed", () => {
  let dealId: string;
  let contractId: string;
  let token: string;

  it("drafts from a template and fills in the deal's details", async () => {
    const made = await dealWithAcceptedQuote();
    dealId = made.deal.id;
    const created = await contracts.createContract(
      dealId,
      (await template("contract")).id,
      made.quoteId,
    );
    expect(created.ok).toBe(true);
    contractId = (created as { data: { id: string } }).data.id;
    const contract = await repo.getContract(contractId);
    expect(contract).toMatchObject({ status: "draft", kind: "contract" });
    expect(contract?.reference).toMatch(/^CT-\d{4}-\d{4}$/);
    expect(contract?.body).toContain("Cora Client");
    expect(contract?.body).toContain("PHP 112,000.00");
    expect(contract?.body).toContain("PHP 56,000.00");
    expect(contract?.body).toContain("Design and build");
    expect(contract?.body).not.toContain("{{");
  });

  it("allows only one live contract of a kind per deal", async () => {
    const second = await contracts.createContract(
      dealId,
      (await template("contract")).id,
      (await prisma.quote.findFirstOrThrow({ where: { dealId } })).id,
    );
    expect(second).toMatchObject({ ok: false });
  });

  it("edits the draft, then sends it with a secret link and a real PDF", async () => {
    const draft = await repo.getContract(contractId);
    expect(
      (
        await contracts.saveContract(contractId, {
          title: draft!.title,
          body: `${draft!.body}\n\n9. Extra\nOne more clause.`,
          validUntil: inDays(30),
        })
      ).ok,
    ).toBe(true);

    const sent = await contracts.sendContract(contractId);
    expect(sent.ok).toBe(true);
    token = tokenOf(sent);
    const row = await prisma.contract.findUniqueOrThrow({ where: { id: contractId } });
    expect(row.status).toBe("sent");
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.sentHash).toMatch(/^[0-9a-f]{64}$/);

    const view = await repo.getPublicContract(token);
    expect(view?.recipientName).toBe("Cora Client");
    expect(JSON.stringify(view)).not.toContain("@example.com");
    const file = await pdf.renderContractPdf(view!, {
      name: "CAFTON",
      email: "hello@cafton.com",
      place: "Baguio City, Philippines",
    });
    expect(file.subarray(0, 4).toString()).toBe("%PDF");

    // Once sent, the wording is frozen, in the app and in the database.
    expect(
      (await contracts.saveContract(contractId, { title: "x", body: "y", validUntil: inDays(5) }))
        .ok,
    ).toBe(false);
    await expect(
      prisma.contract.update({ where: { id: contractId }, data: { body: "changed" } }),
    ).rejects.toThrow();
  });

  it("records the client's signature and keeps it forever", async () => {
    expect(
      (
        await pub.respondToContract({
          action: "accept",
          token,
          name: "Cora Client",
          email: "",
          agreed: false as never,
        })
      ).ok,
    ).toBe(false);
    const signed = await pub.respondToContract({
      action: "accept",
      token,
      name: "Cora Client",
      email: "",
      agreed: true,
    });
    expect(signed).toMatchObject({ ok: true, data: { status: "accepted" } });

    const row = await prisma.contract.findUniqueOrThrow({ where: { id: contractId } });
    expect(row).toMatchObject({
      status: "accepted",
      acceptedByName: "Cora Client",
      acceptedIp: "203.0.113.20",
      acceptedUserAgent: "TestBrowser/2.0",
    });
    expect(row.acceptedHash).toBe(row.sentHash);
    expect(await prisma.auditLog.count({ where: { action: "contract.accept" } })).toBe(1);

    expect(
      (await pub.respondToContract({ action: "decline", token, reason: "changed my mind" })).ok,
    ).toBe(false);
    expect((await contracts.deleteContract(contractId)).ok).toBe(false);
    await expect(prisma.contract.delete({ where: { id: contractId } })).rejects.toThrow();
    expect((await contracts.withdrawContract(contractId, "x")).ok).toBe(false);
    // A deal with a signed contract can't be deleted.
    expect((await deals.deleteDeal(dealId)).ok).toBe(false);
  });
});

describe("rules around a contract", () => {
  it("makes a statement of work follow an accepted quote", async () => {
    counter += 1;
    const contact = await prisma.contact.create({
      data: { firstName: "No", lastName: "Quote", email: `nq-${counter}@example.com` },
    });
    const stage = await prisma.pipelineStage.findFirstOrThrow({
      where: { kind: "open", pipeline: { isDefault: true } },
    });
    const deal = await prisma.deal.create({
      data: { title: "Bare deal", contactId: contact.id, stageId: stage.id },
    });
    expect((await contracts.createContract(deal.id, (await template("sow")).id)).ok).toBe(false);
  });

  it("will not send to a contact with no email, or with a bad sign-by date", async () => {
    const { deal, quoteId } = await dealWithAcceptedQuote({ email: false });
    const created = (await contracts.createContract(
      deal.id,
      (await template("contract")).id,
      quoteId,
    )) as { data: { id: string } };
    expect(await contracts.sendContract(created.data.id)).toMatchObject({ ok: false });
    await prisma.contact.update({
      where: { id: deal.contactId },
      data: { email: `late-${counter}@example.com` },
    });
    const body = (await repo.getContract(created.data.id))!;
    await contracts.saveContract(created.data.id, {
      title: body.title,
      body: body.body,
      validUntil: inDays(400),
    });
    expect(await contracts.sendContract(created.data.id)).toMatchObject({ ok: false });
  });

  it("won't reopen a won deal once its contract is signed", async () => {
    const { deal, quoteId } = await dealWithAcceptedQuote();
    const made = (await contracts.createContract(
      deal.id,
      (await template("contract")).id,
      quoteId,
    )) as { data: { id: string } };
    const sent = await contracts.sendContract(made.data.id);
    // Win the deal at the accepted quote's total, then reopen it: fine while nothing is signed.
    expect((await deals.winDeal(deal.id)).ok).toBe(true);
    expect((await deals.reopenDeal(deal.id)).ok).toBe(true);
    expect((await deals.winDeal(deal.id)).ok).toBe(true);

    expect(
      (
        await pub.respondToContract({
          action: "accept",
          token: tokenOf(sent),
          name: "Cora Client",
          email: "",
          agreed: true,
        })
      ).ok,
    ).toBe(true);
    const refused = await deals.reopenDeal(deal.id);
    expect(refused).toMatchObject({ ok: false });
    expect((refused as { error: string }).error).toMatch(/signed contract/);
    expect(
      (await prisma.deal.findUniqueOrThrow({ where: { id: deal.id }, include: { stage: true } }))
        .stage.kind,
    ).toBe("won");
  });

  it("withdraws with a reason, makes a new link on request, and withdraws on a lost deal", async () => {
    const { deal, quoteId } = await dealWithAcceptedQuote();
    const made = (await contracts.createContract(
      deal.id,
      (await template("contract")).id,
      quoteId,
    )) as { data: { id: string } };
    const sent = await contracts.sendContract(made.data.id);
    const old = tokenOf(sent);
    const fresh = await contracts.renewContractLink(made.data.id);
    expect(await repo.getPublicContract(old)).toBeNull();
    const newToken = tokenOf(fresh);
    expect(await repo.getPublicContract(newToken)).not.toBeNull();

    expect((await contracts.withdrawContract(made.data.id, "")).ok).toBe(false);
    expect((await deals.loseDeal(deal.id, "Went elsewhere")).ok).toBe(true);
    expect((await prisma.contract.findUniqueOrThrow({ where: { id: made.data.id } })).status).toBe(
      "withdrawn",
    );
    expect((await repo.getPublicContract(newToken))?.status).toBe("withdrawn");
    expect(
      (
        await pub.respondToContract({
          action: "accept",
          token: newToken,
          name: "Cora Client",
          email: "",
          agreed: true,
        })
      ).ok,
    ).toBe(false);
  });

  it("refuses to be signed when the stored wording no longer matches what was sent", async () => {
    const { deal, quoteId } = await dealWithAcceptedQuote();
    const made = (await contracts.createContract(
      deal.id,
      (await template("contract")).id,
      quoteId,
    )) as { data: { id: string } };
    const token = tokenOf(await contracts.sendContract(made.data.id));
    await db.exec(`ALTER TABLE contracts DISABLE TRIGGER USER`);
    await db.exec(`UPDATE contracts SET body = 'Tampered' WHERE id = '${made.data.id}'`);
    await db.exec(`ALTER TABLE contracts ENABLE TRIGGER USER`);
    expect(
      await pub.respondToContract({
        action: "accept",
        token,
        name: "Cora Client",
        email: "",
        agreed: true,
      }),
    ).toMatchObject({ ok: false });
  });

  it("expires a sent contract once its date has passed", async () => {
    const { deal, quoteId } = await dealWithAcceptedQuote();
    const made = (await contracts.createContract(
      deal.id,
      (await template("contract")).id,
      quoteId,
    )) as { data: { id: string } };
    await contracts.sendContract(made.data.id);
    await db.exec(`ALTER TABLE contracts DISABLE TRIGGER USER`);
    await db.exec(`UPDATE contracts SET valid_until = '2020-01-01' WHERE id = '${made.data.id}'`);
    await db.exec(`ALTER TABLE contracts ENABLE TRIGGER USER`);
    expect(await server_.expireDueContracts()).toBeGreaterThanOrEqual(1);
    expect((await prisma.contract.findUniqueOrThrow({ where: { id: made.data.id } })).status).toBe(
      "expired",
    );
  });
});

describe("sales targets and the overview", () => {
  it("lets an administrator set, change and clear a target", async () => {
    const month = new Date().toISOString().slice(0, 7);
    expect((await targets.setSalesTarget(SALES.id, month, "250,000")).ok).toBe(true);
    expect((await targets.setSalesTarget(SALES.id, month, "abc")).ok).toBe(false);
    expect((await targets.setSalesTarget(SALES.id, "nope", "1")).ok).toBe(false);

    const data = await overview.getSalesOverview(month);
    const row = data.owners.find((owner) => owner.ownerId === SALES.id);
    expect(row).toMatchObject({ targetMinor: 250_000_00 });
    expect(data.month.targetMinor).toBeGreaterThanOrEqual(250_000_00);
    expect(data.open.count).toBeGreaterThan(0);

    expect((await targets.setSalesTarget(SALES.id, month, "")).ok).toBe(true);
    expect(
      (await overview.getSalesOverview(month)).owners.find((o) => o.ownerId === SALES.id)
        ?.targetMinor,
    ).toBeNull();
  });

  it("is only for people who may manage targets", async () => {
    current = SALES;
    const result = await targets.setSalesTarget(SALES.id, "2026-11", "1,000");
    current = OWNER;
    expect(result.ok).toBe(false);
  });
});
