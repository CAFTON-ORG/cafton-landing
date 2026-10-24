// Invites someone to the dashboard from the command line. Needed once, to create the
// first owner: nobody can invite anybody until one person has access.
//
//   npm run staff:invite -- you@gmail.com owner
//
// Uses DIRECT_URL (or DATABASE_URL) from .env. The person then signs in with that Google
// account at /login. Safe to run again: it just changes the role of a pending invite.
import "dotenv/config";
import pg from "pg";

const [email, roleKey = "owner"] = process.argv.slice(2);
if (!email || !email.includes("@")) {
  console.error("Usage: npm run staff:invite -- <email> [owner|admin|viewer|<custom-role-key>]");
  process.exit(1);
}

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Set DIRECT_URL or DATABASE_URL in .env first.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
});
await client.connect();
try {
  await client.query("BEGIN");
  const role = await client.query("SELECT id, name FROM roles WHERE key = $1", [roleKey]);
  if (role.rowCount === 0)
    throw new Error(`No role with key "${roleKey}". Run the migrations first.`);

  const address = email.trim().toLowerCase();
  const existing = await client.query("SELECT 1 FROM profiles WHERE lower(email) = $1", [address]);
  if (existing.rowCount > 0) throw new Error(`${address} already has access.`);

  await client.query(
    `INSERT INTO staff_invites (email, role_id) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET role_id = EXCLUDED.role_id`,
    [address, role.rows[0].id],
  );
  await client.query(
    `INSERT INTO audit_log (actor_name, action, entity, entity_id, summary)
     VALUES ('System (command line)', 'user.invite', 'user', $1, $2)`,
    [address, `Invited ${address} as ${role.rows[0].name}`],
  );
  await client.query("COMMIT");
  console.log(
    `Invited ${address} as ${role.rows[0].name}. They can now sign in at /login with that Google account.`,
  );
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
