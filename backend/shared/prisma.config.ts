import { defineConfig } from '@prisma/config'

export default defineConfig({
  schema: './db/schema.prisma',
  earlyAccess: true,
  studio: {
    port: 5555
  },
  migrate: {
    datasource: {
      url: process.env.DATABASE_URL || "postgresql://scooter:scooter123@localhost:5432/scooterdb?schema=public",
    }
  }
})
