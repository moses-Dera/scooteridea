# 🏗️ Backend — E-Bike Sharing Platform

> Microservices architecture with Node.js + Python, real-time MQTT integration, and dynamic pricing engine.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 10+
- Docker & Docker Compose
- Git

### Setup (First Time)

```bash
# Clone and install monorepo deps
npm install

# Start Docker services (PostgreSQL, Redis, MQTT)
npm run docker:up

# Build all services
npm run build

# Start all services in dev mode
npm run dev
```

### Verify Services Are Running

```bash
# In a new terminal, test each service
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Fleet Service
curl http://localhost:3003/health  # Ride Service
curl http://localhost:3004/health  # Matching Service
curl http://localhost:3005/health  # Pricing Service
curl http://localhost:3006/health  # Payment Service
curl http://localhost:3007/health  # Notification Service
curl http://localhost:3008/health  # WebSocket Hub
curl http://localhost:3009/health  # Dock Service
```

All should return `200 OK`.

---

## 📁 Service Directory

| Service | Port | Responsibility |
|---------|------|-----------------|
| **Auth Service** | 3001 | JWT issuance, OAuth, RBAC |
| **Fleet Service** | 3002 | MQTT ingestion, Redis updates, telemetry fan-out |
| **Ride Service** | 3003 | Ride lifecycle, billing |
| **Matching Service** | 3004 | Bike-rider matching, geospatial queries |
| **Pricing Service** | 3005 | Surge pricing calculations |
| **Payment Service** | 3006 | Stripe/Paystack integration |
| **Notification Service** | 3007 | Push, SMS, email |
| **WebSocket Hub** | 3008 | Real-time client updates |
| **Dock Service** | 3009 | Dock telemetry, slot state |
| **API Gateway** | 443 | Auth, rate-limiting, routing (Kong/Nginx) |

---

## 🛠️ Development Workflow

### Run a Single Service

```bash
cd backend/services/auth
npm install  # if needed
npm run dev
```

### Run All Services (Recommended)

```bash
cd /path/to/root
npm run dev
```

Uses Turbo to start all services in parallel, watching for file changes.

### View Logs

```bash
# All services
npm run dev -- --log-prefix=prefix

# Single service
cd backend/services/fleet && npm run dev
```

---

## 🗄️ Database & Infrastructure

### Start Infrastructure

```bash
npm run docker:up
```

Starts:
- **PostgreSQL** (port 5432) — Transactional data, user profiles, ride history
- **Redis** (port 6379) — Live locations, sessions, cache
- **MQTT Broker** (port 1883) — Bike telemetry ingestion
- **Kafka** (port 9092) — Event streaming between services

### Stop Infrastructure

```bash
npm run docker:down
```

### Clean Infrastructure (Fresh Start)

```bash
npm run docker:clean
```

Removes all volumes. Database will be reset.

---

## 📋 Environment Variables

Create a `.env` file in `backend/` with the following:

### Core Services

```env
# Node.js runtime
NODE_ENV=development
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ebike_platform
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ebike_platform

# Redis
REDIS_URL=redis://localhost:6379

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_CLIENT_ID=fleet-service
MQTT_USERNAME=admin
MQTT_PASSWORD=admin

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=api-server

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRY=900        # 15 minutes
JWT_REFRESH_TOKEN_EXPIRY=2592000   # 30 days

# Authentication
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_SECRET=your-oauth-secret
```

### Payment Integration

```env
# Stripe
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Paystack (Nigerian payments)
PAYSTACK_API_KEY=pk_test_...
```

### Notifications

```env
# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# Firebase (Push notifications)
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
```

### Third-Party APIs

```env
# Mapbox (Maps & routing)
MAPBOX_ACCESS_TOKEN=pk_...

# GPS/Location services
LOCATION_SERVICE_API_KEY=...
```

### Deployment

```env
# GCP (if deploying to Cloud Run)
GCP_PROJECT_ID=your-project
GCP_REGION=us-central1

# S3/GCS (ride history, logs)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=ebike-platform-rides
```

**See `.env.example` for defaults.**

---

## 🔗 Shared Libraries

All services use shared utilities from `backend/shared/`:

### `@ebike/kafka`
Event streaming between services.

```javascript
const { kafka } = require('@ebike/kafka');

// Produce
await kafka.produce('fleet.telemetry', { bikeId: 'BK-001', lat: 6.52 });

// Consume
kafka.consume('fleet.telemetry', async (msg) => {
  console.log('Bike update:', msg.value);
});
```

### `@ebike/redis`
Caching, sessions, geospatial queries.

```javascript
const { redis } = require('@ebike/redis');

// Set + Get
await redis.set('bike:BK-001:location', JSON.stringify({ lat, lng }));
const location = await redis.get('bike:BK-001:location');

// Geospatial (find nearby)
const nearby = await redis.geoSearch('fleet:available', {
  longitude: 3.37, latitude: 6.52, radius: 2, unit: 'km'
});
```

### `@ebike/mqtt`
IoT device communication.

```javascript
const { mqtt } = require('@ebike/mqtt');

// Subscribe to bike telemetry
mqtt.subscribe('bikes/+/telemetry', (bikeId, payload) => {
  console.log(`Bike ${bikeId}: ${payload.battery_pct}%`);
});

// Publish command to bike
mqtt.publish(`bikes/BK-001/commands`, { command: 'UNLOCK', ts: Date.now() });
```

### `@ebike/db`
Prisma ORM + migrations.

```javascript
const { prisma } = require('@ebike/db');

const user = await prisma.user.findUnique({ where: { id: 'U-123' } });
const rides = await prisma.ride.findMany({ where: { userId: 'U-123' } });
```

### `@ebike/types`
Shared TypeScript interfaces.

```typescript
import { Bike, Ride, User } from '@ebike/types';

const bike: Bike = { id: 'BK-001', battery: 87, status: 'available' };
```

---

## 🧪 Testing

### Run All Tests

```bash
npm run test
```

Uses Turbo to run tests in parallel across all services.

### Test a Single Service

```bash
cd backend/services/auth
npm run test
npm run test -- --watch  # watch mode
```

### Test Coverage

```bash
npm run test -- --coverage
```

---

## 🐳 Docker & Deployment

### Build Service Docker Image

```bash
# Build all services
npm run build

# Or build specific service
cd backend/services/auth
docker build -f Dockerfile -t ebike-auth:latest .
```

### Run Locally (Without Docker)

```bash
npm run dev
```

### Deploy to Production

See `backend/infra/` for:
- Terraform scripts (GCP infrastructure)
- Kubernetes manifests (GKE deployment)
- Docker Compose for development

---

## 🔧 Common Tasks

### Reset Database

```bash
npm run docker:clean
npm run docker:up
```

### Check if Services Are Healthy

```bash
# Run health check on all services
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009; do
  echo "Port $port:"
  curl -s http://localhost:$port/health | jq .
done
```

### View PostgreSQL

```bash
# Connect to Postgres
psql postgresql://postgres:postgres@localhost:5432/ebike_platform

# List tables
\dt

# View users
SELECT * FROM users;
```

### View Redis

```bash
# Connect to Redis
redis-cli

# View all keys
keys *

# View bike location
get bike:BK-001:location

# View bike status
get bike:BK-001:status
```

### Test MQTT

```bash
# Subscribe to all bike telemetry
mosquitto_sub -h localhost -t 'bikes/+/telemetry'

# In another terminal, publish test telemetry
mosquitto_pub -h localhost -t 'bikes/BK-001/telemetry' -m '{"lat": 6.52, "lng": 3.37, "battery_pct": 87}'
```

---

## 📚 Further Reading

- [Technical Architecture](../technical_architecture.md) — System design overview
- [Backend Architecture](./backend_architecture.md) — Detailed service specs
- [Frontend README](../frontend/README.md) — Operator dashboard + rider app
- [Simulator README](../simulator/README.md) — IoT hardware simulator

---

## 🆘 Troubleshooting

### Services won't start

```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Verify Docker is running
docker ps

# Check if ports are in use
lsof -i :3001
```

### Database connection error

```bash
# Check if PostgreSQL is running
docker logs $(docker ps --filter "ancestor=postgres" -q)

# Restart services
npm run docker:down
npm run docker:up
```

### MQTT not connecting

```bash
# Check MQTT broker
docker logs $(docker ps --filter "ancestor=emqx" -q)

# Test MQTT connection
mosquitto_sub -h localhost -v -t '#'
```

---

**Need help?** Open an issue on GitHub or reach out to the team.
