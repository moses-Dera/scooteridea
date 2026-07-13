const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding docks in Lagos...');

  await prisma.dock.createMany({
    data: [
      {
        name: 'Lagos Island Dock',
        location_lat: 6.453,
        location_lng: 3.38,
        total_slots: 10,
        available_slots: 5,
      },
      {
        name: 'Marina Dock',
        location_lat: 6.45,
        location_lng: 3.385,
        total_slots: 15,
        available_slots: 15,
      },
      {
        name: 'Eko Atlantic Dock',
        location_lat: 6.435,
        location_lng: 3.395,
        total_slots: 20,
        available_slots: 12,
      },
    ],
    skipDuplicates: true,
  });

  console.log('Docks seeded successfully!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
