// ─────────────────────────────────────────────────────────────────────────────
//  @ebike/core — Health Check Registry
//
//  Implements the two-endpoint pattern used by Kubernetes:
//    GET /health/live   → liveness  (is the process alive?)
//    GET /health/ready  → readiness (are all dependencies healthy?)
//
//  Each dependency (DB, Redis, Kafka, MQTT) registers a probe.
//  The /ready endpoint is what your load balancer checks before routing traffic.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { logger } from '../logger';

export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface HealthProbeResult {
  status:   HealthStatus;
  latencyMs?: number;
  detail?:  string;
}

type ProbeFn = () => Promise<HealthProbeResult>;

interface RegisteredProbe {
  name: string;
  fn:   ProbeFn;
  /** If critical=true, a 'down' result makes /ready return 503. */
  critical: boolean;
}

const probes: RegisteredProbe[] = [];

/**
 * Register a dependency health probe.
 *
 * @example
 * registerProbe('postgres', async () => {
 *   await prisma.$queryRaw`SELECT 1`;
 *   return { status: 'ok' };
 * }, { critical: true });
 */
export function registerProbe(
  name: string,
  fn: ProbeFn,
  options: { critical?: boolean } = {},
): void {
  probes.push({ name, fn, critical: options.critical ?? true });
}

/** Run all probes and return a summary. */
async function runProbes(): Promise<{
  status:       HealthStatus;
  checks:       Record<string, HealthProbeResult>;
  uptimeSeconds: number;
}> {
  const checks: Record<string, HealthProbeResult> = {};
  let overall: HealthStatus = 'ok';

  await Promise.allSettled(
    probes.map(async ({ name, fn, critical }) => {
      const start = Date.now();
      try {
        const result  = await fn();
        const latency = Date.now() - start;
        checks[name]  = { ...result, latencyMs: latency };

        if (result.status === 'down'     && critical)    overall = 'down';
        if (result.status === 'degraded' && overall !== 'down') overall = 'degraded';
      } catch (err) {
        checks[name] = {
          status:  'down',
          latencyMs: Date.now() - start,
          detail:  err instanceof Error ? err.message : 'Unknown error',
        };
        if (critical) overall = 'down';
        logger.warn({ probe: name, err }, '[Health] Probe failed');
      }
    }),
  );

  return {
    status:        overall,
    checks,
    uptimeSeconds: Math.floor(process.uptime()),
  };
}

/**
 * Returns a pre-built Express Router for health endpoints.
 * Mount at the service root: app.use(healthRouter())
 */
export function healthRouter(): Router {
  const router = Router();

  // Liveness — just confirms the Node.js process is running
  router.get('/health/live', (_req, res) => {
    res.json({ status: 'ok', ts: new Date().toISOString() });
  });

  // Readiness — checks all registered probes
  router.get('/health/ready', async (_req, res) => {
    const result = await runProbes();
    const httpStatus = result.status === 'down' ? 503 : 200;
    res.status(httpStatus).json({
      ...result,
      ts: new Date().toISOString(),
      service: process.env.SERVICE_NAME ?? 'unknown',
    });
  });

  return router;
}
