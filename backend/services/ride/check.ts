import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.systemConfig.findMany().then(console.log).finally(() => prisma.$disconnect());
