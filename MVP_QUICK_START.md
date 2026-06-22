# 🚀 MVP Quick Start — Backend + Operator Dashboard

> Get the core e-bike platform running in 5 minutes

---

## What's Included (MVP)

For the MVP, you need these **essential services only**:

| Service | Port | Why It's Essential |
|---------|------|-------------------|
| **Auth Service** | 3001 | User login/session management |
| **Fleet Service** | 3002 | Bike location tracking from MQTT |
| **Ride Service** | 3003 | Start/end rides, billing |
| **Matching Service** | 3004 | Find nearest bike for rider |
| **WebSocket Hub** | 3008 | Live map updates to dashboard |
| **Operator Dashboard** | 4000 | Fleet management UI (web/) |

**Optional/Future:**
- Rider Web App (3010)

**Services to skip for MVP:**
- Pricing Service (use flat rate)
- Payment Service (manual billing)
- Notification Service (can add later)
- Dock Service (optional for MVP)
- ML Service (heuristic matching only)

---

## 🏃 Start in 2 Steps

### Step 1: Start Infrastructure (2 min)

```bash
cd /home/moze/codes/scooteridea
npm run docker:up
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- MQTT broker (port 1883)
- Kafka (port 9092)

**Wait for them to be ready** (~30 seconds):
```bash
docker ps | grep -E "postgres|redis|emqx|kafka"
```

### Step 2: Start Services (2 min)

```bash
npm run dev
```

This starts all services in parallel using Turbo. **Wait for "ready" messages** (~1 minute):

```
@ebike/auth-service:dev: ✓ Server running on http://localhost:3001
@ebike/fleet-service:dev: ✓ Server running on http://localhost:3002
@ebike/ride-service:dev: ✓ Server running on http://localhost:3003
@ebike/matching-service:dev: ✓ Server running on http://localhost:3004
@ebike/websocket-hub:dev: ✓ Server running on http://localhost:3008
@ebike/operator-web:dev: ✓ Local:   http://localhost:4000
```

---

## ✅ Verify Everything Works

Open new terminal and run:

```bash
# Check all services are responding
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # Fleet
curl http://localhost:3003/health  # Ride
curl http://localhost:3004/health  # Matching
curl http://localhost:3008/health  # WebSocket Hub

# Should all return 200 OK
```

---

## 🎯 Access the Dashboard

1. Open browser: **http://localhost:4000**
2. You'll see the operator dashboard (fleet management UI)

**Test the flow:**
1. Live fleet map shows bikes (simulated)
2. Click a bike to see details
3. Dock management view
4. Ride history

---

## 🧪 Test Core Flow

### 1. Start the IoT Simulator (Optional but Recommended)

In a **new terminal**:

```bash
cd backend && npm run dev -- --filter=ebike-simulator
```

This simulates bikes sending GPS/telemetry data.

### 2. Watch Live Map Update

1. Go to dashboard: http://localhost:4000/fleet
2. You should see bike pins moving on the map in real-time
3. Each bike updates every 3-5 seconds

### 3. Test a Ride (Manual)

```bash
# Get auth token
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rider@example.com","password":"password123"}'
```

Response will have `accessToken`. Use it for ride requests:

```bash
# Find nearby bikes
curl -X POST http://localhost:3004/match/request \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat":6.5244,"lng":3.3792,"radiusKm":2}'

# Start a ride
curl -X POST http://localhost:3003/rides/reserve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bikeId":"BK-001"}'
```

---

## 🛠️ Environment Setup

The MVP uses defaults from `.env.example`. To customize:

```bash
cp backend/.env.example backend/.env
# Edit backend/.env if needed (usually not required for MVP)
```

**Key vars for MVP:**
```env
DATABASE_URL=postgresql://ebike:secret@localhost:5432/ebike
REDIS_URL=redis://localhost:6379
MQTT_BROKER_URL=mqtt://localhost:1883
KAFKA_BROKERS=localhost:9092
```

See `backend/ENV_DOCUMENTATION.md` for all options.

---

## 📁 MVP Service Startup Order

**Turbo starts them in parallel, but here's the dependency chain:**

```
1. PostgreSQL + Redis + MQTT + Kafka (docker-compose)
           ↓
2. Auth Service (manages JWT tokens)
           ↓
3. Fleet Service (subscribes to MQTT)
   Matching Service (queries Redis geo)
   Ride Service (uses Auth + Matching)
           ↓
4. WebSocket Hub (relays fleet events to frontend)
           ↓
5. Operator Dashboard (connects to WebSocket)
```

All happen automatically with `npm run dev`.

---

## 🚨 Troubleshooting MVP

### "Connection refused" errors?

Check Docker services are running:
```bash
docker ps | grep -E "postgres|redis|emqx"
```

If not, restart:
```bash
npm run docker:down
npm run docker:up
# Wait 30 seconds for services to be ready
```

### Services won't start?

Check Node modules are installed:
```bash
npm install
npm run build
npm run dev
```

### Dashboard won't load?

Make sure WebSocket Hub is running:
```bash
curl http://localhost:3008/health
```

If not responding, check logs:
```bash
# In the dev terminal, look for @ebike/websocket-hub errors
```

### No bikes showing on map?

1. Start the simulator: `npm run dev -- --filter=ebike-simulator`
2. Wait 10 seconds for first telemetry
3. Refresh dashboard

### "MQTT broker connection failed"?

```bash
docker logs $(docker ps --filter "ancestor=emqx" -q)
```

MQTT should show connection logs.

---

## 📊 MVP Checklist

- [x] Infrastructure (Docker Compose)
- [x] Auth Service
- [x] Fleet Service (MQTT → Redis)
- [x] Ride Service
- [x] Matching Service
- [x] WebSocket Hub (live updates)
- [x] Operator Dashboard
- [x] Database schema (auto-migrated)
- [x] Environment setup

**All ready for MVP testing!**

---

## 🎬 Next Steps After MVP

Once MVP is working:

1. **Add Payment Service** — Real payment processing
2. **Add Pricing Service** — Dynamic surge pricing
3. **Add Dock Service** — Dock-enforced ride endings
4. **Add Notification Service** — Push/SMS/email
5. **Deploy to GCP** — Cloud Run + GKE
6. **React Native Mobile App** — Native iOS/Android
7. **ML Service** — Trained matching engine

---

## 📞 Quick Reference

| Action | Command |
|--------|---------|
| Start infrastructure | `npm run docker:up` |
| Start all services | `npm run dev` |
| Stop everything | `npm run docker:down` |
| View logs | Check terminal where `npm run dev` runs |
| Reset database | `npm run docker:clean && npm run docker:up` |
| Dashboard URL | http://localhost:4000 |
| API base URL | http://localhost (API Gateway on 443, localhost uses 3001-3009) |

---

**You're ready! Run `npm run docker:up && npm run dev` and visit http://localhost:4000** 🚀
