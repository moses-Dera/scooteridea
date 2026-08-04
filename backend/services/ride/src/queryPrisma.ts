import { prisma } from '@ebike/db';

async function main() {
  const rides = await prisma.ride.findMany({
    orderBy: { endedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      fareCents: true,
      distanceKm: true,
      lockedBaseFareCents: true,
      lockedPerMinCents: true,
      lockedPerKmCents: true,
      surgeMult: true,
    }
  });
  console.log(JSON.stringify(rides, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
