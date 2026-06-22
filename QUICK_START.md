# 🚀 Quick Start Guide

## Recommended Workflow: Check → Run → Watch

### Step 1: Check Status First
```bash
npm run cleanup              # Clean up old processes
./scripts/verify-startup.sh  # Check what's active
```

### Step 2: Start System
```bash
npm run all
```

This starts Docker, runs migrations, starts all services, and shows status.

### Step 3: Watch Output for Errors
The script shows real-time startup progress and any errors.

### Step 4: Stop Everything  
```bash
npm run cleanup
```

---

## Complete Workflow

```bash
# Check status
npm run cleanup
./scripts/verify-startup.sh

# Start system  
npm run all

# ... your development work ...

# Stop system
npm run cleanup
```

---

## What Gets Started

- PostgreSQL (5440), Redis (6380), MQTT (1883), Kafka (9092)
- Auth, Fleet, Payment, Ride, Notification, WebSocket services
- Rider App (3000), Admin Dashboard (4000)

---

## Troubleshooting

Port conflicts:
```bash
npm run cleanup
npm run all
```

See logs:
```bash
docker compose -f backend/infra/docker-compose.yml logs -f
```
