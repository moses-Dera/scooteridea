# 🏗️ Backend Architecture — E-Bike Sharing Platform

> **Pattern:** Microservices · **Runtime:** Node.js (primary) + Python (ML)  
> **Transport:** REST + WebSocket + MQTT + Kafka  
> **Deployment:** GCP Cloud Run (stateless) + GKE (stateful workers)

---

## 1. Service Catalogue

| #   | Service                  | Responsibility                                  | Lang    | Port |
| --- | ------------------------ | ----------------------------------------------- | ------- | ---- |
| 1   | **Auth Service**         | JWT issuance, refresh, OAuth, RBAC              | Node.js | 3001 |
| 2   | **Fleet Service**        | MQTT ingestion, Redis writes, telemetry fan-out | Node.js | 3002 |
| 3   | **Ride Service**         | Ride lifecycle (start → end → bill)             | Node.js | 3003 |
| 4   | **Matching Service**     | Geo-query, scoring, bike reservation            | Node.js | 3004 |
| 5   | **Pricing Service**      | Surge calc per geohash, fare formula            | Node.js | 3005 |
| 6   | **Payment Service**      | Stripe/Paystack integration, wallet             | Node.js | 3006 |
| 7   | **Notification Service** | Push, SMS, email fan-out                        | Node.js | 3007 |
| 8   | **WebSocket Hub**        | Client subscriptions, live event relay          | Node.js | 3008 |
| 9   | **Dock Service**         | Dock telemetry, slot state, rebalancing alerts  | Node.js | 3009 |
| 10  | **ML Service**           | PPO matching, anomaly detection inference       | Python  | 8000 |
| 11  | **API Gateway**          | Auth, rate-limit, routing (Kong / Nginx)        | —       | 443  |

---

## 2. Folder Structure (Monorepo)

```
scooteridea/
├── simulator/                  ← (existing) IoT hardware simulator
├── backend/
│   ├── gateway/                ← Kong config / Nginx proxy
│   ├── services/
│   │   ├── auth/
│   │   │   ├── src/
│   │   │   │   ├── controllers/
│   │   │   │   ├── services/
│   │   │   │   ├── repositories/
│   │   │   │   ├── middleware/
│   │   │   │   └── routes/
│   │   │   ├── Dockerfile
│   │   │   └── package.json
│   │   ├── fleet/
│   │   ├── ride/
│   │   ├── matching/
│   │   ├── pricing/
│   │   ├── payment/
│   │   ├── notification/
│   │   ├── websocket-hub/
│   │   ├── dock/
│   │   └── ml/                 ← Python FastAPI
│   ├── shared/
│   │   ├── kafka/              ← Producer/consumer wrappers
│   │   ├── redis/              ← Redis client + helpers
│   │   ├── db/                 ← Prisma schema + migrations
│   │   ├── mqtt/               ← MQTT client wrapper
│   │   └── types/              ← Shared TypeScript interfaces
│   ├── infra/
│   │   ├── docker-compose.yml
│   │   ├── k8s/
│   │   └── terraform/
│   └── .env.example
└── technical_architecture.md
```

---

## 3. Service Deep-Dives

### 3.1 Auth Service

**Responsibilities:** Register/login, JWT access + refresh tokens, OAuth (Google), role-based guards (Rider | Operator | Admin).

```
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
POST /auth/oauth/google
```

**Pattern:** Controller → Service → Repository

```javascript
// Controller layer (thin)
async login(req, res) {
  const tokens = await authService.login(req.body);
  res.json(tokens);
}

// Service layer (business logic)
async login({ email, password }) {
  const user = await userRepo.findByEmail(email);
  await bcrypt.compare(password, user.passwordHash);     // throws if mismatch
  return tokenService.issueTokenPair(user);
}

// Repository layer (DB only)
async findByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}
```

**JWT Payload:**

```json
{ "sub": "user_id", "role": "RIDER", "iat": 1234567890, "exp": 1234571490 }
```

**Redis keys:**

```
refresh:{user_id}  →  refresh_token  (TTL: 30 days)
blacklist:{jti}    →  1              (TTL: access token lifetime)
```

---

### 3.2 Fleet Service

**Responsibilities:** Subscribe to all MQTT telemetry topics, parse payloads, write live state to Redis, publish Kafka events for downstream consumers.

**MQTT Subscriptions:**

```
bikes/+/telemetry   →  handleBikeTelemetry()
docks/+/status      →  handleDockTelemetry()
bikes/+/alerts      →  handleBikeAlert()
```

**Bike Telemetry Handler (core loop):**

```javascript
async handleBikeTelemetry(bikeId, payload) {
  const { lat, lng, battery_pct, speed_kmh, lock_status, docked_at } = payload;

  // 1. Write live location to Redis (expires in 30s — stale auto-purge)
  await redis.setEx(`bike:${bikeId}:location`, 30, JSON.stringify({ lat, lng, battery_pct, speed_kmh }));

  // 2. Update geospatial index
  await redis.geoAdd('fleet:available', { longitude: lng, latitude: lat, member: bikeId });

  // 3. Update status
  const status = docked_at ? 'charging' : lock_status === 'LOCKED' ? 'available' : 'in_use';
  await redis.set(`bike:${bikeId}:status`, status);

  // 4. Emit to Kafka for WebSocket Hub + DB write
  await kafka.produce('fleet.telemetry', { bikeId, lat, lng, battery_pct, status, ts: Date.now() });

  // 5. Persist to Postgres every 60s (handled by consumer in FleetWorker)
}
```

**Kafka Topics published:**

| Topic             | Consumers                           |
| ----------------- | ----------------------------------- |
| `fleet.telemetry` | WebSocket Hub, DB Writer Worker     |
| `fleet.alert`     | Notification Service, Ops Dashboard |
| `dock.status`     | WebSocket Hub, Pricing Service      |

---

### 3.3 Ride Service

**Responsibilities:** Full ride lifecycle — reserve, start, track, end, calculate fare, trigger billing.

**API:**

```
POST /rides/reserve          ← Reserve bike (15s hold)
POST /rides/:id/start        ← Confirm start, send UNLOCK to bike
POST /rides/:id/end          ← End ride, calculate fare, trigger payment
GET  /rides/:id              ← Ride detail
GET  /rides/history          ← Paginated ride history
POST /rides/:id/dispute      ← Flag a ride
```

**Ride State Machine:**

```
IDLE → RESERVED → ACTIVE → COMPLETING → COMPLETED
                  ↓                        ↑
                CANCELLED ←────────────────┘ (dispute path)
```

**Start Ride Flow:**

```javascript
async startRide(rideId, userId) {
  const ride = await rideRepo.findById(rideId);

  // Guards
  if (ride.status !== 'RESERVED') throw new ConflictError('Ride not in RESERVED state');
  if (ride.userId !== userId)     throw new ForbiddenError();

  // Send UNLOCK command via MQTT
  await mqttClient.publish(`bikes/${ride.bikeId}/commands`, JSON.stringify({
    command: 'UNLOCK', rideId, ts: Date.now()
  }));

  // Mark active + set session in Redis
  await rideRepo.updateStatus(rideId, 'ACTIVE', { startedAt: new Date() });
  await redis.set(`session:${userId}`, JSON.stringify({ rideId, bikeId: ride.bikeId, startedAt: Date.now() }));

  // Emit event
  await kafka.produce('ride.started', { rideId, bikeId: ride.bikeId, userId });
}
```

**End Ride + Fare Calculation:**

```javascript
async endRide(rideId, dockId) {
  const ride     = await rideRepo.findById(rideId);
  const duration = (Date.now() - ride.startedAt.getTime()) / 60000; // minutes
  const distance = await routeService.calculateDistance(ride.startLocation, ride.endLocation);
  const surge    = await pricingService.getSurgeMultiplier(ride.endLocation);

  const fare = (BASE_FARE + COST_PER_MIN * duration + COST_PER_KM * distance) * surge;

  // Send LOCK command
  await mqttClient.publish(`bikes/${ride.bikeId}/commands`, JSON.stringify({ command: 'LOCK' }));

  // Persist
  await rideRepo.complete(rideId, { endedAt: new Date(), fare, dockId });

  // Bill
  await kafka.produce('payment.charge', { userId: ride.userId, amount: fare, rideId });

  // Cleanup Redis
  await redis.del(`session:${ride.userId}`);
}
```

---

### 3.4 Matching Service

**Responsibilities:** Accept a rider location, find + score candidate bikes, make a reservation.

**API:**

```
POST /match/request   body: { lat, lng, radiusKm }
```

**Algorithm:**

```javascript
async matchBike(userLat, userLng, radiusKm = 2) {
  // Step 1: Geospatial query — sub 10ms
  const candidates = await redis.geoSearch('fleet:available', {
    longitude: userLng, latitude: userLat,
    radius: radiusKm, unit: 'km',
    count: 30, sort: 'ASC', withCoord: true, withDist: true
  });

  if (!candidates.length) throw new NotFoundError('No bikes available nearby');

  // Step 2: Score each candidate
  const scored = await Promise.all(candidates.map(async (c) => {
    const bikeData = JSON.parse(await redis.get(`bike:${c.member}:location`));
    return {
      bikeId: c.member,
      score: scoreBike({
        distanceKm:  c.distance,
        batteryPct:  bikeData.battery_pct,
        nearestDock: await getNearestDockDistance(bikeData.lat, bikeData.lng)
      })
    };
  }));

  // Step 3: Pick best
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  // Step 4: Atomic reservation (Lua script prevents double-booking)
  const reserved = await redis.eval(RESERVE_BIKE_LUA, 1, `bike:${best.bikeId}:status`);
  if (!reserved) return this.matchBike(userLat, userLng, radiusKm); // retry with next

  return best.bikeId;
}

function scoreBike({ distanceKm, batteryPct, nearestDock }) {
  return (1 / distanceKm)   * 0.40
       + (batteryPct / 100) * 0.30
       + (1 / (nearestDock + 0.1)) * 0.30;
}
```

**Lua script for atomic reservation** (prevents race conditions):

```lua
-- RESERVE_BIKE_LUA
local status = redis.call('GET', KEYS[1])
if status == 'available' then
  redis.call('SET', KEYS[1], 'reserved')
  redis.call('EXPIRE', KEYS[1], 15)  -- 15s hold
  return 1
end
return 0
```

---

### 3.5 Pricing Service

**Responsibilities:** Calculate surge multipliers per geohash cell every 60s. Serve fare estimates.

**API:**

```
GET /pricing/surge?lat=&lng=        ← Current multiplier at location
GET /pricing/estimate?bikeId=&dest= ← Fare estimate for a trip
```

**Surge Calculation (runs every 60s via cron):**

```javascript
async recalculateSurge() {
  const activeCells = await redis.keys('geohash:demand:*');

  for (const key of activeCells) {
    const geohash = key.split(':')[2];
    const demand  = parseInt(await redis.get(key) || '0');
    const supply  = await redis.zCount('fleet:available', '-inf', '+inf'); // refined per cell

    const ratio = supply / Math.max(demand, 1);
    const multiplier =
      ratio > 2.0 ? 1.0 :
      ratio > 1.0 ? 1.2 :
      ratio > 0.5 ? 1.5 : 2.0;

    await redis.setEx(`geohash:surge:${geohash}`, 120, multiplier.toString());
  }
}
```

---

### 3.6 WebSocket Hub

**Responsibilities:** Maintain persistent WebSocket connections to rider apps and operator dashboards. Relay Kafka events to subscribed clients.

**Connection:**

```
wss://api.platform.com/live?token=<jwt>
```

**Subscription model:**

```javascript
// Client sends on connect:
{ "subscribe": ["bike:BK-00123", "dock:DOCK-007", "fleet:nearby"] }

// Server relays matching Kafka events:
{ "event": "bike_location_update", "bikeId": "BK-00123", "lat": 6.52, "lng": 3.37, "battery": 87 }
{ "event": "dock_status_update",   "dockId": "DOCK-007", "availableSlots": 3 }
{ "event": "surge_update",         "geohash": "s17c",     "multiplier": 1.5 }
```

**Scale strategy:** Each WebSocket Hub pod uses Redis Pub/Sub as a backplane — Kafka consumers publish to Redis channels, and all pods relay to subscribed clients regardless of which pod they're connected to.

```
Kafka (fleet.telemetry) → Consumer → Redis PUBLISH ws:events
                                              ↓
                                    All WS Hub pods subscribe
                                              ↓
                                    Relay to connected clients
```

---

### 3.7 Dock Service

**Responsibilities:** Receive dock telemetry via MQTT, maintain slot state, confirm bike docking events, trigger ride-end when docking confirmed, send rebalancing alerts.

**Dock-In Event Flow:**

```javascript
async handleDockTelemetry(dockId, payload) {
  const { slots, available_slots } = payload;

  // 1. Find newly docked bikes (slot went from null → bikeId)
  const prev    = JSON.parse(await redis.hGetAll(`dock:${dockId}:slots`) || '{}');
  const newDock = slots.filter(s => s.bike_id && !prev[s.slot]);

  // 2. Confirm ride end for each newly docked bike
  for (const slot of newDock) {
    await rideService.confirmDockIn(slot.bike_id, dockId);
  }

  // 3. Update Redis
  await redis.hSet(`dock:${dockId}:status`, { available_slots, total_slots: payload.total_slots });
  for (const slot of slots) {
    await redis.hSet(`dock:${dockId}:slots`, slot.slot.toString(),
      JSON.stringify({ bikeId: slot.bike_id, charging: slot.charging }));
  }

  // 4. Rebalancing alert
  const pct = available_slots / payload.total_slots;
  if (pct <= 0.1) await kafka.produce('ops.alert', { type: 'DOCK_FULL', dockId });
  if (pct >= 0.9) await kafka.produce('ops.alert', { type: 'DOCK_EMPTY', dockId });
}
```

---

## 4. Database Schema (PostgreSQL + PostGIS)

```sql
-- Users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role          TEXT DEFAULT 'RIDER',   -- RIDER | OPERATOR | ADMIN
  wallet_cents  INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Bikes
CREATE TABLE bikes (
  id          TEXT PRIMARY KEY,          -- BK-00123
  status      TEXT DEFAULT 'available',  -- available | in_use | charging | maintenance | offline
  battery_pct INT,
  location    GEOGRAPHY(POINT, 4326),
  dock_id     TEXT REFERENCES docks(id),
  last_seen   TIMESTAMPTZ
);
CREATE INDEX bikes_location_idx ON bikes USING GIST(location);

-- Docking Stations
CREATE TABLE docks (
  id             TEXT PRIMARY KEY,       -- DOCK-007
  name           TEXT NOT NULL,
  location       GEOGRAPHY(POINT, 4326),
  total_slots    INT DEFAULT 0,
  available_slots INT DEFAULT 0
);
CREATE INDEX docks_location_idx ON docks USING GIST(location);

-- Rides
CREATE TABLE rides (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id),
  bike_id        TEXT REFERENCES bikes(id),
  start_dock_id  TEXT REFERENCES docks(id),
  end_dock_id    TEXT REFERENCES docks(id),
  status         TEXT DEFAULT 'RESERVED', -- RESERVED | ACTIVE | COMPLETED | CANCELLED
  start_location GEOGRAPHY(POINT, 4326),
  end_location   GEOGRAPHY(POINT, 4326),
  started_at     TIMESTAMPTZ,
  ended_at       TIMESTAMPTZ,
  fare_cents     INT,
  distance_km    NUMERIC(6,2),
  surge_mult     NUMERIC(3,2) DEFAULT 1.0,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- GPS History (time-series, partitioned by month)
CREATE TABLE bike_locations (
  bike_id   TEXT,
  location  GEOGRAPHY(POINT, 4326),
  battery   INT,
  speed     NUMERIC(4,1),
  ts        TIMESTAMPTZ
) PARTITION BY RANGE (ts);

-- Payments
CREATE TABLE payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id),
  ride_id        UUID REFERENCES rides(id),
  amount_cents   INT,
  currency       TEXT DEFAULT 'NGN',
  status         TEXT,    -- pending | success | failed | refunded
  provider       TEXT,    -- stripe | paystack
  provider_ref   TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Geofences
CREATE TABLE geofences (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      TEXT,
  type      TEXT,   -- operational | slow | no_ride | dock
  boundary  GEOGRAPHY(POLYGON, 4326),
  speed_cap INT     -- km/h, NULL means no cap
);
CREATE INDEX geofences_boundary_idx ON geofences USING GIST(boundary);
```

---

## 5. Kafka Event Bus

| Topic             | Producer        | Consumers                  | Payload                                 |
| ----------------- | --------------- | -------------------------- | --------------------------------------- |
| `fleet.telemetry` | Fleet Service   | WS Hub, DB Writer          | `{ bikeId, lat, lng, battery, status }` |
| `dock.status`     | Dock Service    | WS Hub, Pricing            | `{ dockId, availableSlots }`            |
| `ride.started`    | Ride Service    | Notification, Pricing      | `{ rideId, bikeId, userId }`            |
| `ride.ended`      | Ride Service    | Payment, Notification      | `{ rideId, fare, userId }`              |
| `payment.charge`  | Ride Service    | Payment Service            | `{ userId, amount, rideId }`            |
| `payment.result`  | Payment Service | Ride Service, Notification | `{ rideId, status }`                    |
| `ops.alert`       | Fleet/Dock      | Notification, Dashboard    | `{ type, bikeId/dockId }`               |
| `fleet.command`   | Ride/Ops        | Fleet Service (MQTT relay) | `{ bikeId, command }`                   |

---

## 6. Redis Key Reference

```
# Bike state
bike:{id}:location     STRING  { lat, lng, battery, speed }   TTL: 30s
bike:{id}:status       STRING  available|in_use|charging|...   TTL: none
bike:{id}:dock         STRING  dock_id                          TTL: none
fleet:available        ZSET    Redis GEO — all available bikes
fleet:charging         ZSET    Redis GEO — bikes at docks

# Dock state
dock:{id}:status       HASH    { available_slots, total_slots }
dock:{id}:slots        HASH    slot_num → { bikeId, charging }
docks:all              ZSET    Redis GEO — all docks
docks:available        ZSET    Redis GEO — docks with free slots

# Sessions & auth
session:{user_id}      STRING  { rideId, bikeId, startedAt }
refresh:{user_id}      STRING  refresh_token                    TTL: 30d
blacklist:{jti}        STRING  1                                TTL: access token exp

# Pricing
geohash:surge:{hash}   STRING  multiplier (1.0–2.0)             TTL: 120s
geohash:demand:{hash}  STRING  request count                    TTL: 120s
```

---

## 7. API Gateway Rules (Kong / Nginx)

```yaml
routes:
  - path: /auth/*         → auth-service:3001     (public)
  - path: /match/*        → matching-service:3004  (jwt required)
  - path: /rides/*        → ride-service:3003      (jwt required)
  - path: /pricing/*      → pricing-service:3005   (public read, jwt write)
  - path: /payment/*      → payment-service:3006   (jwt required)
  - path: /docks/*        → dock-service:3009      (jwt required)
  - path: /fleet/*        → fleet-service:3002      (operator role)
  - path: /live           → websocket-hub:3008      (jwt in ?token=)

plugins:
  - rate-limit: 100 req/min per IP (unauthenticated), 500 req/min per user
  - jwt-verify: validates RS256 token against public key
  - cors: allow rider-app and operator-dashboard origins
```

---

## 8. Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/ebike

# Redis
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_GROUP_ID=ebike-backend

# MQTT
MQTT_BROKER_URL=mqtt://emqx.example.com:1883
MQTT_USERNAME=backend
MQTT_PASSWORD=secret

# Auth
JWT_ACCESS_SECRET=<RS256 private key>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# Payments
STRIPE_SECRET_KEY=sk_live_...
PAYSTACK_SECRET_KEY=sk_live_...

# Maps
MAPBOX_ACCESS_TOKEN=pk.eyJ1...

# GCP
GCP_PROJECT_ID=ebike-platform
GCP_REGION=africa-south1
```

---

## 9. MQTT Command Publisher (Shared Utility)

```javascript
// shared/mqtt/commander.js
class BikeCommander {
  constructor(mqttClient) {
    this.client = mqttClient;
  }

  unlock(bikeId, rideId) {
    return this._send(bikeId, { command: 'UNLOCK', rideId });
  }
  lock(bikeId) {
    return this._send(bikeId, { command: 'LOCK' });
  }
  alarm(bikeId) {
    return this._send(bikeId, { command: 'ALARM' });
  }
  disable(bikeId, reason) {
    return this._send(bikeId, { command: 'DISABLE', reason });
  }
  speedLimit(bikeId, kmh) {
    return this._send(bikeId, { command: 'SPEED_LIMIT', value: kmh });
  }

  _send(bikeId, payload) {
    return this.client.publishAsync(
      `bikes/${bikeId}/commands`,
      JSON.stringify({ ...payload, ts: Date.now() }),
      { qos: 1 }, // at-least-once delivery
    );
  }
}
```

---

## 10. Geofence Enforcement (Fleet Service)

```javascript
async checkGeofence(bikeId, lat, lng) {
  // PostGIS point-in-polygon — called on each telemetry update
  const zones = await db.query(`
    SELECT id, type, speed_cap FROM geofences
    WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
  `, [lng, lat]);

  for (const zone of zones) {
    if (zone.type === 'no_ride') {
      await bikeCommander.disable(bikeId, 'NO_RIDE_ZONE');
      await kafka.produce('ops.alert', { type: 'ZONE_VIOLATION', bikeId, lat, lng });
    }
    if (zone.type === 'slow' && zone.speed_cap) {
      await bikeCommander.speedLimit(bikeId, zone.speed_cap);
    }
  }
}
```

---

## 11. Service Communication Matrix

```
Client App     ──HTTPS──▶  API Gateway  ──HTTP──▶  Auth / Ride / Match / Pricing
Client App     ──WSS────▶  WebSocket Hub

Bike Hardware  ──MQTT───▶  EMQX Broker  ──MQTT──▶  Fleet Service
Dock Hardware  ──MQTT───▶  EMQX Broker  ──MQTT──▶  Dock Service

Fleet Service  ──Kafka──▶  WebSocket Hub  (live location relay)
Fleet Service  ──Kafka──▶  DB Writer      (GPS history persistence)
Ride Service   ──Kafka──▶  Payment Service
Ride Service   ──Kafka──▶  Notification Service
Dock Service   ──Kafka──▶  Ride Service   (dock-in confirmation)
Payment Svc    ──Kafka──▶  Ride Service   (payment result)

Fleet Service  ──MQTT───▶  EMQX Broker  ──MQTT──▶  Bike (UNLOCK/LOCK commands)
```

---

## 12. Build Order (Implementation Sequence)

```
Week 1–2   shared/  — db schema, redis client, kafka wrapper, mqtt wrapper
Week 3     auth/    — register, login, JWT, middleware
Week 4     fleet/   — MQTT ingestion, Redis writes, Kafka emit
Week 5     dock/    — dock telemetry, slot state, dock-in trigger
Week 6     websocket-hub/  — Kafka consumer → WS relay
Week 7     matching/       — Geo query, scoring, Lua reservation
Week 8     ride/           — Full lifecycle, MQTT commands
Week 9     pricing/        — Surge calc, fare estimate
Week 10    payment/        — Stripe/Paystack integration, wallet
Week 11    notification/   — Push, SMS
Week 12    ml/             — PPO matching inference, anomaly detection
```

### 8. MQTT Broker Transition (Mosquitto -> EMQX)

Currently, for the MVP and Beta Test, the `docker-compose.yml` is configured to use **Eclipse Mosquitto**. Mosquitto is an ultra-lightweight C-based MQTT broker that consumes ~3MB of RAM, making it perfect for running the entire stack on a $6/mo (1GB RAM) DigitalOcean Droplet.

When scaling beyond 10,000+ scooters or requiring multi-server clustering, you must revert to **EMQX**.

**To revert to EMQX:**

1. Open `backend/infra/docker-compose.yml`.
2. Replace the `mosquitto` block with:

```yaml
emqx:
  image: emqx/emqx:5.6.0
  ports:
    - '1883:1883' # MQTT
    - '8083:8083' # WebSocket MQTT
    - '18083:18083' # Dashboard
  environment:
    EMQX_NAME: emqx
    EMQX_HOST: 127.0.0.1
  volumes:
    - emqx_data:/opt/emqx/data
  healthcheck:
    test: ['CMD', '/opt/emqx/bin/emqx', 'ping']
    interval: 5s
    retries: 5
```

3. In `docker-compose.yml`, update `MQTT_BROKER_URL` for `fleet-service`, `ride-service`, and `dock-service` from `mqtt://mosquitto:1883` back to `mqtt://emqx:1883`.
4. Run `docker-compose up -d --build`.
   _Note: Ensure your cloud server has at least 2GB RAM ($12/mo plan) before switching back to EMQX._
