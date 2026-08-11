import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton: without this, hot-reload would spin
// up a fresh PrismaClient (and a fresh DB connection pool) on every file
// change. Production always gets exactly one instance per server process
// either way.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
