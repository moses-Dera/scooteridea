const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const docks = await prisma.$queryRaw`
      SELECT 
        id, 
        name, 
        available_slots, 
        location_lat as lat,
        location_lng as lng
      FROM docks LIMIT 1;
    `;
    console.log("DOCKS:", docks);
  } catch(e) {
    console.error("ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
