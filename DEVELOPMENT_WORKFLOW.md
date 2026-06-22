# 🚀 Development Workflow Guide

## Quick Start (3 Steps)

### Step 1: Check Status
```bash
npm run status
```

Shows what's running and what's stopped. If all green ✅, skip to step 3.

### Step 2: Start If Needed
```bash
npm run cleanup    # Clear old processes
npm run all        # Start everything
```

Waits ~45 seconds for everything to initialize.

### Step 3: Watch for Errors
```bash
npm run watch
```

Real-time output of all services starting up. Press `Ctrl+C` to stop.

---

## Available Commands

| Command | Purpose |
|---------|---------|
| `npm run status` | Check what's active/inactive |
| `npm run all` | Start entire system (Docker + services + frontend) |
| `npm run watch` | Start system and watch for errors (logs saved) |
| `npm run cleanup` | Stop everything cleanly + free ports |
| `npm run docker:up` | Start just Docker infrastructure |
| `npm run docker:down` | Stop just Docker |
| `npm run docker:clean` | Remove all data volumes (hard reset) |
| `npm run engine` | Start backend only (for development) |
| `npm run simulator` | Start bike simulator dashboard |

---

## Typical Development Session

### Session Start
```bash
# Check what's active
npm run status

# See: ❌ Services not running

# Clean up and start
npm run cleanup && npm run all
```

### During Development
```bash
# Option 1: Watch errors in real-time
npm run watch

# Option 2: Check status anytime
npm run status
```

### Session End
```bash
# Option 1: Stop from npm run watch (press Ctrl+C)
# Automatically stops all services cleanly

# Option 2: Manual cleanup in another terminal
npm run cleanup
```

---

## What Each Command Does

### `npm run status`
- Checks Docker containers (PostgreSQL, Redis, MQTT, Kafka)
- Checks backend services (Auth, Fleet, Payment, Ride, etc.)
- Checks frontend apps (Rider app, Admin dashboard)
- Shows exactly what's running and what's stopped
- Suggests next action if something is down

### `npm run all`
1. Starts Docker infrastructure (PostgreSQL, Redis, Kafka, EMQX)
2. Runs database migrations automatically
3. Starts all backend services
4. Starts frontend applications
5. Runs verification to confirm all active
6. Shows endpoints and status

### `npm run watch`
- Same as `npm run all`
- But pipes all output to screen + `/tmp/ebike-debug.log`
- Useful for watching startup sequence
- Press `Ctrl+C` to stop and cleanup

### `npm run cleanup`
- Kills all Node processes
- Stops all Docker containers
- Frees all ports
- Shows what was cleaned

---

## Troubleshooting

### Problem: Port Already In Use
```bash
npm run cleanup     # Frees all ports
npm run all         # Try again
```

### Problem: MQTT Not Connecting
```bash
npm run status      # Check MQTT container (infra-emqx-1)
npm run docker:down
npm run docker:up
npm run all
```

### Problem: Database Errors
```bash
npm run docker:clean    # Remove volumes (WARNING: loses data)
npm run cleanup
npm run all
```

### Problem: Want to See Full Logs
```bash
npm run watch           # Starts with logging
# ... let it run ...
# Then in another terminal:
tail -f /tmp/ebike-debug.log
```

---

## Endpoints When Running

| Service | URL | Purpose |
|---------|-----|---------|
| Rider App | http://localhost:3000 | Mobile app |
| Admin Dashboard | http://localhost:4000 | Fleet management |
| MQTT | mqtt://localhost:1883 | IoT messaging |
| EMQX Dashboard | http://localhost:18083 | MQTT management |

---

## Best Practices

1. **Always check status first**
   ```bash
   npm run status
   ```

2. **Clean before starting if uncertain**
   ```bash
   npm run cleanup && npm run all
   ```

3. **Watch startup for errors**
   ```bash
   npm run watch
   ```

4. **Review logs after shutdown**
   ```bash
   tail -f /tmp/ebike-debug.log
   ```

5. **Use Ctrl+C to stop (handles cleanup automatically)**

---

## Environment Files

- `.env.mqtt` - MQTT broker configuration
- `.env.local` (frontend) - API URLs and tokens

---

## Next Steps

Ready to start? Run:
```bash
npm run status
```

It will tell you exactly what to do next! 🚀
