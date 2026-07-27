import * as path from 'path';
require('dotenv').config({ path: path.resolve(__dirname, '../../infra/.env') });

import { prisma } from './index';

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

async function main() {
  const count = Number(process.env.SEED_BIKES_COUNT ?? 20);
  const centerLat = Number(process.env.SEED_BIKES_CENTER_LAT ?? 6.4541);
  const centerLng = Number(process.env.SEED_BIKES_CENTER_LNG ?? 3.3792);
  const spread = Number(process.env.SEED_BIKES_SPREAD_DEG ?? 0.03);

  if (!Number.isFinite(count) || count <= 0) {
    throw new Error('SEED_BIKES_COUNT must be a positive number');
  }

  const payload = Array.from({ length: count }).map((_, i) => ({
    id: `BK-${String(i + 1).padStart(5, '0')}`,
    status: 'available' as const,
    batteryPct: Math.floor(randomInRange(55, 100)),
    locationLat: Number((centerLat + randomInRange(-spread, spread)).toFixed(6)),
    locationLng: Number((centerLng + randomInRange(-spread, spread)).toFixed(6)),
  }));

  const result = await prisma.bike.createMany({
    data: payload,
    skipDuplicates: true,
  });

  console.log(
    `Seeded bikes: ${result.count} inserted (${count - result.count} skipped duplicates)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
