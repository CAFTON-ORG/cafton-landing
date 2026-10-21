// Starts a throw-away Postgres on 127.0.0.1 built from the real migrations, so the app can
// be run and tested without Supabase. Everything lives in memory and is gone when this
// stops. Usage: npm run db:local [-- --port 5544]
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { createDatabase } from "./pglite-setup.mjs";

const flag = process.argv.indexOf("--port");
const port = flag > -1 ? Number(process.argv[flag + 1]) : 5544;

const db = await createDatabase();
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 20 });
await server.start();

const url = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
console.log(`Local database ready on ${url}`);
console.log("Point DATABASE_URL and DIRECT_URL at it, and leave the Supabase variables empty to use the dev sign-in.");

const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
