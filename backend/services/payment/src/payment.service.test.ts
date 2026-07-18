// ─────────────────────────────────────────────────────────────────────────────
//  Payment Service — Unit Tests
//
//  Tests the processPaymentCharge logic:
//    - Sufficient balance -> deduct, record success, emit success event
//    - Insufficient balance -> record failure, emit failure event, throw error
//
//  All I/O (Prisma, Kafka) is mocked.
// ─────────────────────────────────────────────────────────────────────────────

// ── Mocks (must be before imports) ───────────────────────────────────────────

jest.mock('@ebike/db', () => {
  const prismaMock: any = {
    user: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb: any) => cb(prismaMock)),
  };
  return { prisma: prismaMock };
});

jest.mock('@ebike/events', () => ({
  publish: jest.fn().mockResolvedValue(undefined),
  TOPICS: {
    PAYMENT_RESULT: 'payment.result',
  },
  createConsumer: jest.fn(),
  connectProducer: jest.fn(),
  disconnectProducer: jest.fn(),
}));

jest.mock('@ebike/redis', () => ({
  getRedisClient: jest.fn(),
  disconnectRedis: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { prisma } from '@ebike/db';
import { publish, TOPICS } from '@ebike/events';
import { InsufficientBalanceError } from '@ebike/core';
import { processPaymentCharge } from './index';
import type { KafkaPaymentChargeEvent } from '@ebike/types';

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('Payment Service - processPaymentCharge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully deduct wallet and emit success if balance is sufficient', async () => {
    const event: KafkaPaymentChargeEvent = {
      rideId: 'ride-123',
      userId: 'user-123',
      amount: 1500, // 1500 cents
      ts: Date.now(),
    };

    // Mock findUniqueOrThrow to return user with enough balance
    (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      id: 'user-123',
      walletCents: 2000,
    });

    await processPaymentCharge(event);

    // 1. Verify user wallet deduction
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { walletCents: { decrement: 1500 } },
    });

    // 2. Verify payment record created
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        rideId: 'ride-123',
        amountCents: 1500,
        currency: 'NGN',
        status: 'success',
        provider: 'wallet',
      },
    });

    // 3. Verify success event emitted
    expect(publish).toHaveBeenCalledWith(
      TOPICS.PAYMENT_RESULT,
      expect.objectContaining({
        rideId: 'ride-123',
        status: 'success',
      }),
    );
  });

  it('should record failure, emit failure, and throw error if balance is insufficient', async () => {
    const event: KafkaPaymentChargeEvent = {
      rideId: 'ride-123',
      userId: 'user-123',
      amount: 1500, // 1500 cents
      ts: Date.now(),
    };

    // Mock findUniqueOrThrow to return user with NOT enough balance
    (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      id: 'user-123',
      walletCents: 500,
    });

    await expect(processPaymentCharge(event)).rejects.toThrow(InsufficientBalanceError);

    // 1. Verify wallet NOT deducted
    expect(prisma.user.update).not.toHaveBeenCalled();

    // 2. Verify failed payment record created
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        rideId: 'ride-123',
        amountCents: 1500,
        currency: 'NGN',
        status: 'failed',
        provider: 'wallet',
      },
    });

    // 3. Verify failure event emitted
    expect(publish).toHaveBeenCalledWith(
      TOPICS.PAYMENT_RESULT,
      expect.objectContaining({
        rideId: 'ride-123',
        status: 'failed',
      }),
    );
  });
});
