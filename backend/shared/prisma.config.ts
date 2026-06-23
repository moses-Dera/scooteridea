import { defineConfig } from '@prisma/config'

export default defineConfig({
  schema: './db/schema.prisma',
  earlyAccess: true,
  studio: {
    port: 5555
  },
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://ebike:secret@localhost:5440/ebike",
  }
})
