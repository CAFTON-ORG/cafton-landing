import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase } from "../../scripts/pglite-setup.mjs";

/**
 * Applies every migration, in order, to an in-memory Postgres (PGlite) with just
 * enough of Supabase stubbed (auth and storage), then exercises the guarantees
 * that live in SQL rather than in code. This checks the real migrations without
 * touching any hosted database.
 */

let db: PGlite;

beforeAll(async () => {
  db = (await createDatabase()) as PGlite;
}, 60_000);

afterAll(async () => {
  await db.close();
});

async function fails(statement: string) {
  try {
    await db.exec(statement);
    return null;
  } catch (error) {
    return (error as Error).message;
  }
}

describe("access migration", () => {
  it("seeds the built-in roles as system roles", async () => {
    const { rows } = await db.query<{ key: string; is_system: boolean }>(
      "SELECT key, is_system FROM roles ORDER BY key",
    );
    expect(rows).toEqual([
      { key: "admin", is_system: true },
      { key: "owner", is_system: true },
      { key: "sales", is_system: true },
      { key: "viewer", is_system: true },
    ]);
  });

  it("rejects sign-up for an email that was not invited", async () => {
    const message = await fails(
      "INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES (gen_random_uuid(), 'stranger@example.com', '{}')",
    );
    expect(message).toMatch(/has not been invited/);
  });

  it("turns an invite into a profile with the invited role on first sign-in", async () => {
    await db.exec(
      "INSERT INTO staff_invites (email, role_id) SELECT 'ada@cafton.com', id FROM roles WHERE key = 'admin'",
    );
    await db.exec(
      `INSERT INTO auth.users (id, email, raw_user_meta_data)
       VALUES (gen_random_uuid(), 'Ada@Cafton.com', '{"full_name":"Ada Lovelace","avatar_url":"https://lh3.googleusercontent.com/a/x"}')`,
    );
    const { rows } = await db.query<{ email: string; full_name: string; role: string }>(
      "SELECT p.email, p.full_name, r.key AS role FROM profiles p JOIN roles r ON r.id = p.role_id",
    );
    expect(rows).toEqual([{ email: "Ada@Cafton.com", full_name: "Ada Lovelace", role: "admin" }]);
  });

  it("keeps the audit log append-only", async () => {
    await db.exec(
      "INSERT INTO audit_log (actor_name, action, entity, summary) VALUES ('Test', 'user.invite', 'user', 'Invited someone')",
    );
    expect(await fails("UPDATE audit_log SET summary = 'tampered'")).toMatch(/append-only/);
    expect(await fails("DELETE FROM audit_log")).toMatch(/append-only/);
    expect(await fails("TRUNCATE audit_log")).toMatch(/append-only/);
    const { rows } = await db.query<{ summary: string }>("SELECT summary FROM audit_log");
    expect(rows).toEqual([{ summary: "Invited someone" }]);
  });

  it("will not delete a role that people or invites still use", async () => {
    expect(await fails("DELETE FROM roles WHERE key = 'admin'")).toMatch(/foreign key constraint/);
  });

  it("enables row level security on every table so the public API sees nothing", async () => {
    const { rows } = await db.query<{ relname: string }>(
      `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity AND c.relname NOT LIKE '\\_%'`,
    );
    expect(rows).toEqual([]);
  });
});

describe("crm migration", () => {
  let contactId: string;
  let stageId: string;

  beforeAll(async () => {
    const contact = await db.query<{ id: string }>(
      "INSERT INTO contacts (first_name, last_name, email, updated_at) VALUES ('Grace', 'Hopper', 'Grace@Example.com', now()) RETURNING id",
    );
    contactId = contact.rows[0].id;
    const stage = await db.query<{ id: string }>("SELECT id FROM pipeline_stages WHERE key = 'new'");
    stageId = stage.rows[0].id;
  });

  const newDeal = (extra = "") =>
    `INSERT INTO deals (title, contact_id, stage_id, updated_at${extra ? ", " + extra.split("|")[0] : ""})
     VALUES ('Website', '${contactId}', '${stageId}', now()${extra ? ", " + extra.split("|")[1] : ""})`;

  it("seeds a six-stage pipeline with ordered probabilities and one won and one lost stage", async () => {
    const { rows } = await db.query<{ key: string; probability: number; kind: string }>(
      "SELECT key, probability, kind FROM pipeline_stages ORDER BY position",
    );
    expect(rows.map((row) => row.key)).toEqual(["new", "discovery", "proposal", "negotiation", "won", "lost"]);
    expect(rows.filter((row) => row.kind === "won")).toHaveLength(1);
    expect(rows.find((row) => row.key === "lost")?.probability).toBe(0);
    expect(rows.find((row) => row.key === "won")?.probability).toBe(100);
  });

  it("adds the sales role", async () => {
    const { rows } = await db.query("SELECT 1 FROM roles WHERE key = 'sales' AND is_system");
    expect(rows).toHaveLength(1);
  });

  it("gives leads and deals readable reference numbers", async () => {
    await db.exec(
      "INSERT INTO leads (first_name, last_name, email, answers, updated_at) VALUES ('A', 'B', 'a@b.co', '{}', now())",
    );
    await db.exec(newDeal());
    const lead = await db.query<{ reference: string }>("SELECT reference FROM leads LIMIT 1");
    const deal = await db.query<{ reference: string }>("SELECT reference FROM deals LIMIT 1");
    expect(lead.rows[0].reference).toMatch(/^LD-[0-9]{4}-[0-9]{4}$/);
    expect(deal.rows[0].reference).toMatch(/^DL-[0-9]{4}-[0-9]{4}$/);
  });

  it("allows one live contact per email, ignoring case, and frees it on soft delete", async () => {
    const insert = "INSERT INTO contacts (first_name, last_name, email, updated_at) VALUES ('G', 'H', 'grace@example.com', now())";
    expect(await fails(insert)).toMatch(/contacts_email_live_key|unique/);
    await db.exec(`UPDATE contacts SET deleted_at = now() WHERE id = '${contactId}'`);
    expect(await fails(insert)).toBeNull();
    await db.exec(`UPDATE contacts SET deleted_at = NULL WHERE id = '${contactId}'`).catch(() => undefined);
  });

  it("refuses a deal that is both won and lost, lost without a reason, or won without an amount", async () => {
    expect(await fails(newDeal("won_at, lost_at, lost_reason, amount_minor|now(), now(), 'x', 100"))).toMatch(
      /deals_not_won_and_lost/,
    );
    expect(await fails(newDeal("lost_at|now()"))).toMatch(/deals_lost_has_reason/);
    expect(await fails(newDeal("won_at|now()"))).toMatch(/deals_won_has_amount/);
    expect(await fails(newDeal("amount_minor|-1"))).toMatch(/deals_amount_not_negative/);
    expect(await fails(newDeal("currency|'peso'"))).toMatch(/deals_currency_iso/);
  });

  it("will not delete a contact that still has deals", async () => {
    const owner = await db.query<{ id: string }>("SELECT contact_id AS id FROM deals LIMIT 1");
    expect(await fails(`DELETE FROM contacts WHERE id = '${owner.rows[0].id}'`)).toMatch(/foreign key constraint/);
  });

  it("requires a timeline entry to belong to a lead, contact or deal", async () => {
    expect(await fails("INSERT INTO activities (body, created_by_name) VALUES ('orphan', 'Test')")).toMatch(
      /activities_has_subject/,
    );
    expect(
      await fails(`INSERT INTO activities (body, created_by_name, contact_id) VALUES ('ok', 'Test', '${contactId}')`),
    ).toBeNull();
  });
});
