import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const docks = await prisma.dock.findMany();
  console.log('Docks Count:', docks.length);
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
