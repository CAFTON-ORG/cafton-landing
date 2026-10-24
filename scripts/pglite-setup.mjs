// Builds an in-memory Postgres (PGlite) from the real migrations, with just enough of
// Supabase stubbed (auth and storage) for them to run. Used by the migration tests and
// by `npm run db:local`, so the schema can be exercised without touching a hosted database.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";

export const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

export const SUPABASE_STUBS = `
  CREATE ROLE authenticated; CREATE ROLE anon;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, raw_user_meta_data jsonb);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  CREATE TABLE storage.objects (id uuid DEFAULT gen_random_uuid(), bucket_id text, name text);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
`;

export function migrationFolders() {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export const migrationSql = (folder) =>
  readFileSync(join(MIGRATIONS_DIR, folder, "migration.sql"), "utf8");

/** Applies every migration whose folder name sorts before `before` (all of them by default). */
export async function createDatabase({ before } = {}) {
  const db = new PGlite({ extensions: { btree_gist } });
  // Supabase sessions run in UTC. PGlite would otherwise inherit this machine's zone and shift every timestamp.
  await db.exec("SET TIME ZONE 'UTC'");
  await db.exec(SUPABASE_STUBS);
  for (const folder of migrationFolders()) {
    if (before && folder >= before) break;
    await db.exec(migrationSql(folder));
  }
  return db;
}

export async function applyMigration(db, folder) {
  await db.exec(migrationSql(folder));
}
