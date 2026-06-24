import { prisma } from './index';

async function main() {
  console.log("Seeding docks in Lagos...");
  
  const { randomUUID } = require('crypto');
  const docks = [
    {
      id: randomUUID(),
      name: "Lagos Island Dock",
      locationLat: 6.4530,
      locationLng: 3.3800,
      totalSlots: 10,
      availableSlots: 5
    },
    {
      id: randomUUID(),
      name: "Marina Dock",
      locationLat: 6.4500,
      locationLng: 3.3850,
      totalSlots: 15,
      availableSlots: 15
    },
    {
      id: randomUUID(),
      name: "Eko Atlantic Dock",
      locationLat: 6.4350,
      locationLng: 3.3950,
      totalSlots: 20,
      availableSlots: 12
    }
  ];

  for (const dock of docks) {
    await prisma.dock.create({ data: dock });
  }

  console.log("Docks seeded successfully!");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
