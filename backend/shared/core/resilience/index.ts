// ─────────────────────────────────────────────────────────────────────────────
//  @ebike/core — Circuit Breaker & Retry Utilities
//
//  Circuit Breaker (opossum):
//    Wraps any async function. After N failures the circuit "opens" and
//    fast-fails for a cooldown window, preventing cascade failures.
//
//  Retry with exponential backoff:
//    For transient errors (network blips, Redis hiccups). Implements
//    full-jitter backoff to prevent thundering herd on restart.
//
//  Dead Letter Queue (DLQ):
//    For Kafka consumer failures. Failed messages are forwarded to a
//    <topic>.dlq topic for later inspection / replay.
// ─────────────────────────────────────────────────────────────────────────────

import CircuitBreaker from 'opossum';
import { logger } from '../logger';

// ── Circuit Breaker ───────────────────────────────────────────────────────────

export interface CircuitBreakerOptions {
  /** % of requests that must fail to open the circuit (default: 50). */
  errorThresholdPercentage?: number;
  /** ms before a half-open probe is attempted (default: 30s). */
  resetTimeout?: number;
  /** ms before a single request is considered failed (default: 5s). */
  timeout?: number;
  /** Fallback function when the circuit is open. */
  fallback?: (...args: unknown[]) => unknown;
}

/**
 * Wrap an async function with a circuit breaker.
 *
 * @example
 * const safeGetUser = withCircuitBreaker(
 *   (id: string) => prisma.user.findUnique({ where: { id } }),
 *   { name: 'postgres', resetTimeout: 15_000 }
 * );
 */
export function withCircuitBreaker<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: CircuitBreakerOptions & { name: string },
): CircuitBreaker<Parameters<T>, Awaited<ReturnType<T>>> {
  const breaker = new CircuitBreaker(fn, {
    errorThresholdPercentage: options.errorThresholdPercentage ?? 50,
    resetTimeout: options.resetTimeout ?? 30_000,
    timeout: options.timeout ?? 5_000,
    volumeThreshold: 5, // min requests before tripping
  });

  if (options.fallback) breaker.fallback(options.fallback);

  breaker.on('open', () => logger.warn(`[CircuitBreaker:${options.name}] OPEN — fast-failing`));
  breaker.on('halfOpen', () => logger.info(`[CircuitBreaker:${options.name}] HALF-OPEN — probing`));
  breaker.on('close', () => logger.info(`[CircuitBreaker:${options.name}] CLOSED — recovered`));
  breaker.on('reject', () =>
    logger.warn(`[CircuitBreaker:${options.name}] Request rejected (circuit open)`),
  );
  breaker.on('timeout', () => logger.warn(`[CircuitBreaker:${options.name}] Timeout`));
  breaker.on('fallback', () => logger.info(`[CircuitBreaker:${options.name}] Fallback triggered`));

  return breaker as CircuitBreaker<Parameters<T>, Awaited<ReturnType<T>>>;
}

// ── Retry with Exponential Backoff ────────────────────────────────────────────

export interface RetryOptions {
  /** Maximum number of attempts (default: 3). */
  maxAttempts?: number;
  /** Initial delay in ms (default: 200). */
  initialDelayMs?: number;
  /** Maximum delay cap in ms (default: 10_000). */
  maxDelayMs?: number;
  /** Whether to abort on non-transient errors (default: true). */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
}

/**
 * Retry an async operation with full-jitter exponential backoff.
 * Jitter prevents thundering herd after a restart or outage.
 *
 * @example
 * const result = await retry(() => redis.ping(), { maxAttempts: 5 });
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions & { label?: string } = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 200,
    maxDelayMs = 10_000,
    shouldRetry = () => true,
    label = 'operation',
  } = options;

  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      if (attempt === maxAttempts || !shouldRetry(err, attempt)) {
        logger.warn(
          { label, attempt, err },
          `[Retry] ${label} failed after ${attempt} attempt(s) — giving up`,
        );
        throw err;
      }

      // Full-jitter backoff: random in [0, min(cap, base * 2^attempt)]
      const cap = Math.min(maxDelayMs, initialDelayMs * 2 ** attempt);
      const delay = Math.random() * cap;

      logger.warn(
        { label, attempt, delayMs: Math.round(delay) },
        `[Retry] ${label} failed (attempt ${attempt}/${maxAttempts}) — retrying in ${Math.round(delay)}ms`,
      );

      await sleep(delay);
    }
  }

  throw lastErr;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Dead Letter Queue (Kafka) ─────────────────────────────────────────────────

/**
 * Wraps a Kafka message handler with DLQ forwarding.
 * If the handler throws after all retries, the raw message is published
 * to `<originalTopic>.dlq` with error metadata attached.
 *
 * @example
 * await consumer.subscribe([TOPICS.FLEET_TELEMETRY], withDLQ(myHandler, producer));
 */
export function withDLQ<T>(
  handler: (payload: T) => Promise<void>,
  publishDLQ: (topic: string, payload: unknown) => Promise<void>,
  options: { originalTopic: string; retries?: number } = { originalTopic: 'unknown' },
) {
  return async (payload: T): Promise<void> => {
    try {
      await retry(() => handler(payload), {
        maxAttempts: options.retries ?? 3,
        label: `kafka:${options.originalTopic}`,
        shouldRetry: (err) => {
          // Don't retry validation / business logic errors — they'll never succeed
          if (err instanceof Error && err.name === 'ValidationError') return false;
          return true;
        },
      });
    } catch (err) {
      const dlqTopic = `${options.originalTopic}.dlq`;
      const dlqPayload = {
        originalTopic: options.originalTopic,
        failedAt: new Date().toISOString(),
        error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err),
        payload,
      };

      logger.error({ err, dlqTopic }, `[DLQ] Message sent to ${dlqTopic}`);

      try {
        await publishDLQ(dlqTopic, dlqPayload);
      } catch (dlqErr) {
        // DLQ publish itself failed — log it prominently but don't crash the consumer
        logger.fatal(
          { dlqErr, dlqTopic, originalPayload: payload },
          '[DLQ] CRITICAL — failed to publish to DLQ',
        );
      }
    }
  };
}
