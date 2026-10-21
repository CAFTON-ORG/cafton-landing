// Fills a LOCAL database with believable sample CRM data so screens can be designed and
// demoed with something in them.
//
//   npm run db:local                     # terminal 1: throw-away Postgres on :5544
//   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5544/postgres npm run db:seed-demo
//
// It refuses to run against anything that is not localhost, so it can never put fake
// customers into the real project. Safe to run twice: it only seeds an empty CRM.
import "dotenv/config";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url || !/@(localhost|127\.0\.0\.1)(:|\/)/.test(url)) {
  console.error("Refusing to seed: DATABASE_URL must point at localhost (use `npm run db:local`).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const daysAgo = (n, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const dayAhead = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

try {
  const existing = await client.query("SELECT count(*)::int AS n FROM contacts");
  if (existing.rows[0].n > 0) {
    console.log("CRM already has data; nothing to do.");
    process.exit(0);
  }
  await client.query("BEGIN");

  const stage = async (key) => (await client.query("SELECT id FROM pipeline_stages WHERE key = $1", [key])).rows[0].id;
  const S = Object.fromEntries(await Promise.all(["new", "discovery", "proposal", "negotiation", "won", "lost"].map(async (k) => [k, await stage(k)])));

  const org = async (name, industry, size, website) =>
    (await client.query("INSERT INTO organizations (name, industry, size, website, updated_at) VALUES ($1,$2,$3,$4,now()) RETURNING id", [name, industry, size, website])).rows[0].id;
  const contact = async (first, last, email, phone, position, orgId) =>
    (await client.query(
      "INSERT INTO contacts (first_name,last_name,email,phone,position,organization_id,source,updated_at) VALUES ($1,$2,$3,$4,$5,$6,'website',now()) RETURNING id",
      [first, last, email, phone, position, orgId],
    )).rows[0].id;

  const o1 = await org("Baguio Craft Coffee", "Food & Beverage", "11-50 employees", "https://example.com/bcc");
  const o2 = await org("Cordillera Realty", "Real Estate & Property", "51-200 employees", "https://example.com/cordillera");
  const o3 = await org("Mt. Pulag Outfitters", "Retail", "2-10 employees", null);
  const o4 = await org("St. Louis Review Center", "Education", "11-50 employees", "https://example.com/slrc");

  const c1 = await contact("Maria", "Santos", "maria@bcc.example", "+639171110001", "Owner / Founder", o1);
  const c2 = await contact("Jun", "Dela Cruz", "jun@cordillera.example", "+639171110002", "Operations Manager", o2);
  const c3 = await contact("Ana", "Reyes", "ana@pulag.example", "+639171110003", "Owner / Founder", o3);
  const c4 = await contact("Paolo", "Bautista", "paolo@slrc.example", "+639171110004", "Director", o4);

  const deal = async (title, contactId, orgId, stageKey, amount, closeIn, extra = {}) =>
    (await client.query(
      `INSERT INTO deals (title, contact_id, organization_id, stage_id, amount_minor, expected_close_date, source, won_at, lost_at, lost_reason, stage_changed_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'website',$7,$8,$9,now(),now()) RETURNING id`,
      [title, contactId, orgId, S[stageKey], amount, closeIn === null ? null : dayAhead(closeIn), extra.wonAt ?? null, extra.lostAt ?? null, extra.lostReason ?? null],
    )).rows[0].id;

  const d1 = await deal("Online ordering and inventory", c1, o1, "proposal", 38_000_000, 21);
  await deal("Property listing portal", c2, o2, "negotiation", 125_000_000, 10);
  await deal("Store POS and stock app", c3, o3, "discovery", 18_500_000, 45);
  await deal("Enrollment and billing system", c4, o4, "new", null, 60);
  await deal("Booking website", c1, o1, "won", 9_500_000, null, { wonAt: daysAgo(6) });
  await deal("Mobile loyalty app", c3, o3, "lost", 42_000_000, null, { lostAt: daysAgo(12), lostReason: "Chose a cheaper competitor" });

  const lead = async (first, last, email, business, area, budget, timeline, status, ago, reason = null) =>
    (await client.query(
      `INSERT INTO leads (first_name,last_name,email,phone,business_name,goals_area,budget,timeline,source,page_path,answers,status,disqualified_reason,created_at,updated_at)
       VALUES ($1,$2,$3,'+639170000000',$4,$5,$6,$7,'Contact Us Page','/contact',$8,$9,$10,$11,$11) RETURNING id`,
      [first, last, email, business, area, budget, timeline, JSON.stringify({ firstName: first, lastName: last, email, businessName: business, budget, timeline, goalsCategory: "operations", goals: ["Inventory", "Reporting"], challenges: ["We still rely on spreadsheets, paper, or messaging apps"], notes: "We would like to talk this week if possible." }), status, reason, daysAgo(ago)],
    )).rows[0].id;

  const l1 = await lead("Grace", "Villanueva", "grace@kapeng.example", "Kapeng Baguio", "Operations", "₱100k - ₱500k", "1-3 months", "new", 0);
  await lead("Ramon", "Aquino", "ramon@aquino.example", "Aquino Hardware", "Growth", "₱500k - ₱1M", "3-6 months", "new", 1);
  await lead("Liza", "Ocampo", "liza@ocampo.example", null, "Product builds", "Under ₱100k", "ASAP", "qualified", 3);
  await lead("Ben", "Ramos", "ben@ramos.example", "Ramos Gym", "Growth", "Under ₱100k", "Not sure yet", "disqualified", 8, "Budget far below our minimum");

  const task = async (title, dueDays, leadId, dealId, done = false) =>
    client.query("INSERT INTO tasks (title,due_at,lead_id,deal_id,done_at) VALUES ($1,$2,$3,$4,$5)", [
      title,
      dueDays === null ? null : new Date(Date.now() + dueDays * 86_400_000).toISOString(),
      leadId,
      dealId,
      done ? new Date().toISOString() : null,
    ]);
  await task("Reply to Grace Villanueva (LD)", 0, l1, null);
  await task("Send the proposal to Baguio Craft Coffee", -1, null, d1);
  await task("Book a discovery call", 3, null, d1);
  await task("Update the case study", null, null, null, true);

  await client.query(
    "INSERT INTO activities (type, body, deal_id, created_by_name, created_at) VALUES ('call','Walked through the ordering flow. They want delivery tracking in phase two.',$1,'Olivia Owner',$2), ('stage_change','Moved from Discovery to Proposal',$1,'Olivia Owner',$3), ('note','Budget confirmed at around 400k.',$1,'Olivia Owner',$4)",
    [d1, daysAgo(4), daysAgo(2), daysAgo(3)],
  );
  await client.query("INSERT INTO audit_log (actor_name, action, entity, summary, created_at) VALUES ('Website contact form','lead.create','lead','New website enquiry from Grace Villanueva',$1), ('Olivia Owner','deal.move','deal','Moved deal from Discovery to Proposal',$2)", [daysAgo(0), daysAgo(2)]);

  await client.query("COMMIT");
  console.log("Seeded demo CRM data: 4 organizations, 4 contacts, 6 deals, 4 leads, 4 tasks.");
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
