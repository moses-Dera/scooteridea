import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(__dirname, '../../.env') });

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "schema.prisma",
  datasource: {
    url: env("DATABASE_URL") ?? 'postgresql://ebike:secret@localhost:5440/ebike?schema=public',
  },
});
