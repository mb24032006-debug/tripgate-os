import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// One PrismaClient per process, reused across Next.js hot-reloads in dev (avoids exhausting the
// Postgres connection pool on every request during `next dev`).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and point it at a Postgres database " +
      "(see prisma/local-postgres.ts for a zero-Docker local instance, or a Neon connection string in production).",
  );
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
