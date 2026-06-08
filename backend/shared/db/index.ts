// ─────────────────────────────────────────────────────────────────────────────
//  @ebike/db — Prisma singleton
//
//  All services import from here via the `@ebike/db` path alias.
//  Using a singleton prevents connection pool exhaustion in long-lived
//  processes and avoids "too many clients" errors on PostgreSQL.
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

// Keep singleton across hot-reloads in dev (ts-node-dev / nodemon)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient };
export default prisma;
