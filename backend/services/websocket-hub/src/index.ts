import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import 'dotenv/config';

import type { JwtPayload, WsServerEvent, WsSubscribeMessage } from '@ebike/types';
import { createConsumer, TOPICS } from '@ebike/events';
import { logger, setupGracefulShutdown, registerCleanup } from '@ebike/core';

process.env.SERVICE_NAME = 'websocket-hub';

const PORT = Number(process.env.PORT ?? 3008);

// ── Client registry: userId → { ws, subscriptions } ─────────────────────────
interface ClientState {
  ws: WebSocket;
  userId: string;
  subscriptions: Set<string>;
}

const clients = new Map<string, ClientState>();

// ── HTTP server + WSS ─────────────────────────────────────────────────────────
const server = http.createServer((_req: http.IncomingMessage, res: http.ServerResponse) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'websocket-hub', clients: clients.size }));
});

const wss = new WebSocketServer({ server });

wss.on('connection', async (ws: WebSocket, req: http.IncomingMessage) => {
  // Auth via ?token= query param
  const token = new URL(req.url!, `http://localhost`).searchParams.get('token');
  if (!token) {
    ws.close(4001, 'Missing token');
    return;
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload;
  } catch {
    ws.close(4003, 'Invalid token');
    return;
  }

  const state: ClientState = {
    ws,
    userId: payload.sub,
    subscriptions: new Set(),
  };
  clients.set(payload.sub, state);

  logger.info({ userId: payload.sub, role: payload.role }, '[WS Hub] Client connected');

  ws.on('message', (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString()) as WsSubscribeMessage;
      if (Array.isArray(msg.subscribe)) {
        msg.subscribe.forEach((ch: string) => {
          // Security: Block riders from subscribing to mass location feeds
          if (ch === 'fleet:all' || ch.startsWith('zone:')) {
            if (payload.role !== 'OPERATOR' && payload.role !== 'ADMIN') {
              logger.warn(
                { userId: payload.sub, role: payload.role, channel: ch },
                '[WS Hub] Unauthorized subscription blocked',
              );
              return; // Reject silently
            }
          }
          state.subscriptions.add(ch);
        });
        logger.debug(
          { userId: payload.sub, channels: Array.from(state.subscriptions) },
          '[WS Hub] Subscribed',
        );
      }
    } catch {
      /* ignore malformed messages */
    }
  });

  ws.on('close', (code, reason) => {
    clients.delete(payload.sub);
    logger.info(
      { userId: payload.sub, code, reason: reason.toString() },
      '[WS Hub] Client disconnected',
    );
  });

  ws.on('error', (err) => {
    logger.warn({ userId: payload.sub, err }, '[WS Hub] WebSocket error');
  });
});

// ── Redis Pub/Sub backplane (horizontal scale strategy) ───────────────────────
async function startRedisPubSub() {
  const sub = createClient({ url: process.env.REDIS_URL });

  sub.on('error', (err) => logger.error({ err }, '[WS Hub] Redis sub client error'));
  sub.on('reconnecting', () => logger.warn('[WS Hub] Redis sub client reconnecting'));

  await sub.connect();

  await sub.subscribe('ws:events', (message: string) => {
    try {
      const event = JSON.parse(message) as WsServerEvent & { _channel?: string };
      broadcastEvent(event);
    } catch {
      /* ignore malformed messages */
    }
  });

  registerCleanup('Redis-Sub', async () => {
    await sub.quit();
  });
  logger.info('[WS Hub] Redis pub/sub backplane active');
}

/** Route an event to all subscribed clients. */
function broadcastEvent(event: WsServerEvent) {
  const payload = JSON.stringify(event);
  let sent = 0;

  for (const [, state] of clients) {
    if (state.ws.readyState !== WebSocket.OPEN) continue;

    const shouldSend =
      (event.event === 'bike_location_update' &&
        (state.subscriptions.has(`bike:${event.bikeId}`) ||
          state.subscriptions.has('fleet:all') ||
          (event.zoneIds && event.zoneIds.some((z) => state.subscriptions.has(`zone:${z}`))))) ||
      (event.event === 'dock_status_update' &&
        (state.subscriptions.has(`dock:${event.dockId}`) || state.subscriptions.has('dock:all'))) ||
      (event.event === 'surge_update' && state.subscriptions.has('surge:all')) ||
      (event.event === 'ride_ended' && state.subscriptions.has(`ride:${event.rideId}`));

    if (shouldSend) {
      state.ws.send(payload);
      sent++;
    }
  }

  logger.debug({ event: event.event, recipients: sent }, '[WS Hub] Event broadcast');
}

// ── Events consumer → Redis pub/sub relay ─────────────────────────────────────
async function startEventsConsumer() {
  const publisher = createClient({ url: process.env.REDIS_URL });
  publisher.on('error', (err) => logger.error({ err }, '[WS Hub] Redis pub client error'));
  await publisher.connect();

  const consumer = createConsumer('ws-hub-consumer');
  await consumer.subscribe(
    [TOPICS.FLEET_TELEMETRY, TOPICS.DOCK_STATUS, TOPICS.RIDE_ENDED],
    async (payload: any) => {
      let event: WsServerEvent | null = null;

      if (payload.bikeId && payload.lat !== undefined) {
        event = {
          event: 'bike_location_update',
          bikeId: payload.bikeId,
          lat: payload.lat,
          lng: payload.lng,
          battery: payload.batteryPct,
          status: payload.status,
          zoneIds: payload.zoneIds,
        };
      } else if (payload.dockId) {
        event = {
          event: 'dock_status_update',
          dockId: payload.dockId,
          availableSlots: payload.availableSlots,
        };
      } else if (payload.rideId && payload.fareCents !== undefined) {
        // RIDE_ENDED — notify the rider that their ride is complete
        event = {
          event: 'ride_ended',
          rideId: payload.rideId,
          fareCents: payload.fareCents,
          userId: payload.userId,
        };
      }

      if (event) {
        await publisher.publish('ws:events', JSON.stringify(event));
      }
    },
  );

  registerCleanup('Redis-Pub', async () => {
    await publisher.quit();
  });
  logger.info('[WS Hub] Events → Redis relay active');
}

// ── Bootstrap ──────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await startRedisPubSub();
    await startEventsConsumer();
  } catch (err) {
    logger.fatal({ err }, '[WS Hub] Fatal startup error — aborting');
    process.exit(1);
  }

  setupGracefulShutdown(server, 10_000);

  server.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV }, '[WS Hub] Ready');
  });
}

bootstrap();
