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
  });
  // Posting to the books takes several queries in one transaction, and each is a round trip to the
  // pooler, so the default 5 seconds is too tight on a remote database.
  return new PrismaClient({ adapter, transactionOptions: { maxWait: 10_000, timeout: 20_000 } });
}

/** Single shared client; reused across hot reloads in development. */
export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
