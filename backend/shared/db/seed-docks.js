const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding docks in Lagos...");
  
  await prisma.dock.createMany({
    data: [
      {
        name: "Lagos Island Dock",
        location_lat: 6.4530,
        location_lng: 3.3800,
        total_slots: 10,
        available_slots: 5
      },
      {
        name: "Marina Dock",
        location_lat: 6.4500,
        location_lng: 3.3850,
        total_slots: 15,
        available_slots: 15
      },
      {
        name: "Eko Atlantic Dock",
        location_lat: 6.4350,
        location_lng: 3.3950,
        total_slots: 20,
        available_slots: 12
      }
    ],
    skipDuplicates: true
  });

  console.log("Docks seeded successfully!");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
