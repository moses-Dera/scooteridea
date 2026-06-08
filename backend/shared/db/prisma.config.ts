// ─────────────────────────────────────────────────────────────────────────────
//  Prisma 7 configuration
//
//  In Prisma v7 the database URL is no longer specified inside schema.prisma.
//  It lives here instead, keeping schema.prisma a pure structural definition.
//  See: https://www.prisma.io/docs/orm/reference/prisma-config-reference
// ─────────────────────────────────────────────────────────────────────────────

import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: 'schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
