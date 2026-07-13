import { prisma } from './index';

async function main() {
  console.log('Seeding docks in Lagos...');

  const { randomUUID } = require('crypto');
  const docks = [
    {
      id: randomUUID(),
      name: 'Lagos Island Dock',
      locationLat: 6.453,
      locationLng: 3.38,
      totalSlots: 10,
      availableSlots: 5,
    },
    {
      id: randomUUID(),
      name: 'Marina Dock',
      locationLat: 6.45,
      locationLng: 3.385,
      totalSlots: 15,
      availableSlots: 15,
    },
    {
      id: randomUUID(),
      name: 'Eko Atlantic Dock',
      locationLat: 6.435,
      locationLng: 3.395,
      totalSlots: 20,
      availableSlots: 12,
    },
  ];

  for (const dock of docks) {
    await prisma.dock.create({ data: dock });
  }

  console.log('Docks seeded successfully!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
