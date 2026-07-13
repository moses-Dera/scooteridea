import { prisma } from '@ebike/db';
import { logger } from '@ebike/core';

/**
 * Debt Collector Cron Job
 * Runs periodically to scan for users with negative wallet balances
 * and a saved Paystack Authorization Code.
 * It attempts to auto-deduct the debt directly from their bank account.
 */
export async function runDebtCollection() {
  logger.info('[DebtCollector] Starting debt recovery scan...');
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock';

  try {
    // 1. Find all users in debt who have a saved bank card token
    const usersInDebt = await prisma.user.findMany({
      where: {
        walletCents: { lt: 0 },
        paystackAuthCode: { not: null },
      },
    });

    if (usersInDebt.length === 0) {
      logger.info('[DebtCollector] No users currently in recoverable debt.');
      return;
    }

    // 2. Attempt to charge each user's card
    for (const user of usersInDebt) {
      // The debt is negative, so we multiply by -1 to get the positive amount to charge
      const amountToChargeCents = user.walletCents * -1;

      logger.info(
        { userId: user.id, amountCents: amountToChargeCents },
        '[DebtCollector] Attempting charge authorization...',
      );

      if (paystackSecret === 'sk_test_mock' || process.env.NODE_ENV !== 'production') {
        // MOCK MODE: Just assume the bank charge succeeded and clear the debt
        logger.warn('[DebtCollector] Mock mode active. Faking successful bank charge.');
        await prisma.user.update({
          where: { id: user.id },
          data: { walletCents: 0 },
        });
        continue;
      }

      // PRODUCTION MODE: Call Paystack Charge Authorization API
      const response = await fetch('https://api.paystack.co/transaction/charge_authorization', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          amount: amountToChargeCents,
          authorization_code: user.paystackAuthCode,
        }),
      });

      const data = (await response.json()) as any;

      if (response.ok && data.data?.status === 'success') {
        logger.info({ userId: user.id }, '[DebtCollector] Bank charge successful! Debt cleared.');

        // Reset wallet to 0
        await prisma.user.update({
          where: { id: user.id },
          data: { walletCents: 0 },
        });
      } else {
        logger.warn(
          { userId: user.id, error: data.message },
          '[DebtCollector] Bank charge failed (Insufficient funds in bank account).',
        );
      }
    }
  } catch (error) {
    logger.error({ error }, '[DebtCollector] Cron job encountered a fatal error.');
  }
}

// If run directly via command line
if (require.main === module) {
  runDebtCollection().then(() => process.exit(0));
}
