// Adds a small price list and two quotes (one draft, one sent) to a LOCAL database that already
// has the demo CRM data, so the sales screens can be designed and reviewed.
//
//   npm run db:local                     # terminal 1: throw-away Postgres on :5544
//   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5544/postgres npm run db:seed-demo
//   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5544/postgres npm run db:seed-sales
//
// Like seed-demo it refuses to run against anything that is not localhost. Safe to run twice: it
// only seeds when there are no quotes. The sent quote uses a fixed public-link secret that
// scripts/design-review.mjs opens at /q/<secret>; links are stored as SHA-256 hashes.
import "dotenv/config";
import { createHash } from "node:crypto";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url || !/@(localhost|127\.0\.0\.1)(:|\/)/.test(url)) {
  console.error("Refusing to seed: DATABASE_URL must point at localhost (use `npm run db:local`).");
  process.exit(1);
}

/** The secret in the sent quote's public link (the design review opens it). */
const SENT_SECRET = "designreviewtoken_aaaaaaaaaaaaaaaaaaaaaaaa";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const dayAhead = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const client = new pg.Client({ connectionString: url });
await client.connect();

/** Line totals in centavos: quantity in thousandths, price per unit, whole-percent discount. */
const lineTotal = (quantityMilli, unitPriceMinor, discountPct) =>
  Math.round(((quantityMilli * unitPriceMinor) / 1000) * (1 - discountPct / 100));

try {
  const existing = await client.query("SELECT count(*)::int AS n FROM quotes");
  if (existing.rows[0].n > 0) {
    console.log("Sales already has quotes; nothing to do.");
    process.exit(0);
  }
  const deals = await client.query(
    "SELECT id, title FROM deals WHERE deleted_at IS NULL ORDER BY created_at LIMIT 2",
  );
  if (deals.rows.length < 2) {
    console.error("No deals found. Run `npm run db:seed-demo` first.");
    process.exit(1);
  }
  await client.query("BEGIN");

  const catalog = await client.query(
    `INSERT INTO catalog_items (name, description, pricing_model, unit_price_minor, unit_label, taxable, updated_at)
     VALUES
       ('Discovery workshop', 'Two half-day sessions to map the problem and scope.', 'fixed', 4500000, 'project', true, now()),
       ('Web application build', 'Design, build and launch of a custom web app.', 'fixed', 38000000, 'project', true, now()),
       ('Engineering time', 'Senior engineer, billed by the hour.', 'hourly', 250000, 'hour', true, now()),
       ('Support retainer', 'Fixes and small changes, monthly.', 'retainer', 3500000, 'month', true, now())
     RETURNING id, name`,
  );
  const item = Object.fromEntries(catalog.rows.map((row) => [row.name, row.id]));

  const insertQuote = async (deal, quote, lines) => {
    const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
    const tax = Math.round(
      lines.filter((line) => line.taxable).reduce((sum, line) => sum + line.total, 0) * 0.12,
    );
    const made = await client.query(
      `INSERT INTO quotes (reference, deal_id, title, intro, terms, status, subtotal_minor, tax_minor,
         total_minor, valid_until, deposit_pct, payment_terms, token_hash, sent_at, sent_to, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, now()) RETURNING id`,
      [
        quote.reference,
        deal.id,
        quote.title,
        quote.intro,
        quote.terms,
        "draft",
        subtotal,
        tax,
        subtotal + tax,
        dayAhead(quote.validDays),
        quote.depositPct,
        quote.paymentTerms,
        null,
        null,
        null,
      ],
    );
    for (const [position, line] of lines.entries()) {
      await client.query(
        `INSERT INTO quote_lines (quote_id, position, catalog_item_id, description, quantity_milli,
           unit_label, unit_price_minor, discount_pct, taxable, total_minor)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          made.rows[0].id,
          position,
          line.catalogItemId,
          line.description,
          line.quantityMilli,
          line.unitLabel,
          line.unitPriceMinor,
          line.discountPct,
          line.taxable,
          line.total,
        ],
      );
    }
    // A trigger locks the lines of a sent quote, so it is marked sent only once they are in.
    if (quote.status === "sent") {
      await client.query(
        "UPDATE quotes SET status = 'sent', token_hash = $2, sent_at = now(), sent_to = $3 WHERE id = $1",
        [made.rows[0].id, hash(quote.secret), "client@example.com"],
      );
    }
  };
  const line = (
    catalogItemId,
    description,
    quantityMilli,
    unitLabel,
    unitPriceMinor,
    discountPct,
  ) => ({
    catalogItemId,
    description,
    quantityMilli,
    unitLabel,
    unitPriceMinor,
    discountPct,
    taxable: true,
    total: lineTotal(quantityMilli, unitPriceMinor, discountPct),
  });

  await insertQuote(
    deals.rows.find((deal) => deal.title === "Online ordering and inventory") ?? deals.rows[0],
    {
      reference: "QT-2026-0001",
      title: "Online ordering and inventory system",
      intro: "Thank you for the time. Here is what we propose for the ordering and inventory work.",
      terms: "Includes two rounds of revisions. Hosting is billed separately.",
      status: "draft",
      validDays: 30,
      depositPct: 50,
      paymentTerms:
        "The deposit is due when the quote is accepted. The balance is due on completion.",
    },
    [
      line(item["Discovery workshop"], "Discovery workshop", 1000, "project", 4500000, 0),
      line(item["Web application build"], "Web application build", 1000, "project", 38000000, 20),
      line(item["Engineering time"], "Extra engineering time", 12000, "hour", 250000, 0),
    ],
  );
  await insertQuote(
    deals.rows.find((deal) => deal.title !== "Online ordering and inventory") ?? deals.rows[1],
    {
      reference: "QT-2026-0002",
      title: "Monthly support",
      intro: "A simple monthly support arrangement.",
      terms: "Cancel any time with 30 days' notice.",
      status: "sent",
      validDays: 14,
      depositPct: 0,
      paymentTerms: "Billed monthly in advance, due on the 1st of each month.",
      secret: SENT_SECRET,
    },
    [line(item["Support retainer"], "Support retainer", 1000, "month", 3500000, 0)],
  );

  await client.query("COMMIT");
  console.log("Seeded the price list (4 items) and 2 quotes (1 draft, 1 sent).");
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
