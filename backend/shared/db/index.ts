// ─────────────────────────────────────────────────────────────────────────────
//  @ebike/db — Prisma singleton
//
//  All services import from here via the `@ebike/db` path alias.
//  Using a singleton prevents connection pool exhaustion in long-lived
//  processes and avoids "too many clients" errors on PostgreSQL.
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

// Initialize the database connection pool and adapter for Prisma 7
const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient({ adapter });

// Keep singleton across hot-reloads in dev (ts-node-dev / nodemon)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient };
export default prisma;
