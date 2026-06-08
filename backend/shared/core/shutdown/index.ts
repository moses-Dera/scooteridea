// ─────────────────────────────────────────────────────────────────────────────
//  @ebike/core — Graceful Shutdown
//
//  Handles SIGTERM / SIGINT with a configurable drain timeout.
//  Every long-lived resource (HTTP server, Kafka consumer, Redis, MQTT) must
//  register a cleanup callback here.
//
//  Shutdown sequence:
//    1. Stop accepting new connections (server.close)
//    2. Run all registered cleanup callbacks in parallel
//    3. If timeout exceeded → force exit(1)
//    4. Otherwise → exit(0)
// ─────────────────────────────────────────────────────────────────────────────

import http from 'http';
import { logger } from '../logger';

type CleanupFn = () => Promise<void>;

const registry: Array<{ name: string; fn: CleanupFn }> = [];

/**
 * Register a resource to be cleaned up on shutdown.
 *
 * @example
 * registerCleanup('Redis', () => client.quit());
 * registerCleanup('Kafka Producer', () => producer.disconnect());
 */
export function registerCleanup(name: string, fn: CleanupFn): void {
  registry.push({ name, fn });
}

/**
 * Wire graceful shutdown to SIGTERM + SIGINT.
 * Call once per process, after the HTTP server starts.
 *
 * @param server  - The http.Server instance to drain.
 * @param timeoutMs - Max ms to wait before force-killing (default 10s).
 */
export function setupGracefulShutdown(
  server: http.Server,
  timeoutMs = 10_000,
): void {
  async function shutdown(signal: string): Promise<void> {
    logger.info(`[Shutdown] Received ${signal}. Starting graceful shutdown…`);

    // 1. Stop accepting new HTTP connections
    server.close(() => logger.info('[Shutdown] HTTP server closed'));

    // 2. Enforce timeout
    const timer = setTimeout(() => {
      logger.error('[Shutdown] Timeout exceeded — forcing exit(1)');
      process.exit(1);
    }, timeoutMs);
    timer.unref(); // don't keep event loop alive just for this

    // 3. Run all cleanup callbacks
    await Promise.allSettled(
      registry.map(async ({ name, fn }) => {
        try {
          await fn();
          logger.info(`[Shutdown] ✓ ${name} closed`);
        } catch (err) {
          logger.error({ err }, `[Shutdown] ✗ ${name} failed to close`);
        }
      }),
    );

    clearTimeout(timer);
    logger.info('[Shutdown] All resources released. Exiting cleanly.');
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // ── Unhandled rejection / uncaught exception guardrails ───────────────────
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, '[Process] Unhandled Promise Rejection');
    // Give the logger time to flush, then exit — unhandled rejections are bugs
    setTimeout(() => process.exit(1), 500);
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, '[Process] Uncaught Exception — shutting down');
    setTimeout(() => process.exit(1), 500);
  });
}
