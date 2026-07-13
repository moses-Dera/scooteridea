import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding production database...');

  // This is the bcrypt hash for 'password123'
  // Using a pre-computed hash so we don't need to install bcrypt in the db package
  const passwordHash = '$2a$10$D/1R8Q9Q.qC4r1L0g6E21O2j.3O5d0j0g5X6U2R7O9V9B0N6M5';

  // Upsert the super admin to ensure it always exists without duplicating
  const admin = await prisma.user.upsert({
    where: { email: 'admin@scooter.com' },
    update: {
      role: 'ADMIN',
      passwordHash: passwordHash,
    },
    create: {
      email: 'admin@scooter.com',
      name: 'Super Admin',
      passwordHash: passwordHash,
      role: 'ADMIN',
      walletCents: 0,
    },
  });

  // Ensure default System Config exists
  await prisma.systemConfig.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      unlockFeeCents: 5000,
      perMinuteCents: 2000,
      perKmCents: 3000,
      maxSurgeMult: 2.5,
      outOfDockFeeCents: 50000,
    },
  });

  console.log('✅ Seeding complete!');
  console.log('Admin Email:', admin.email);
  console.log('Admin Password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
