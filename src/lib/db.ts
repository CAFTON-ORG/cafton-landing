import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // DATABASE_URL is the pooled (Supavisor, port 6543) connection string.
  // DATABASE_POOL_MAX is optional: it caps connections, e.g. on a small pooler or a local test database.
  const max = Number(process.env.DATABASE_POOL_MAX);
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? "",
    ...(Number.isInteger(max) && max > 0 ? { max } : {}),
    // Opening a connection to a hosted pooler takes seconds (TLS, authentication). The default
    // closes an idle connection after 10 seconds, so a person reading a page for a moment paid that
    // again on the next click. Keep connections warm, and fail loudly when one cannot be opened.
    idleTimeoutMillis: 10 * 60_000,
    connectionTimeoutMillis: 20_000,
    keepAlive: true,
  });
  return new PrismaClient({ adapter });
}

/** Single shared client; reused across hot reloads in development. */
export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
