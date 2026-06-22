# 🔧 Permanent Startup Fixes

## Issue #1: Database Migrations Not Persisted
**Problem:** Migrations folder missing, migrations run only in memory
**Solution:** Create and commit initial migration
**Impact:** Solves the `relation "geofences" does not exist` error permanently

## Issue #2: Kafka Connection Failures
**Problem:** Kafka takes time to initialize, services connect before it's ready
**Solution:** 
- Option A: Add retry logic with exponential backoff
- Option B: Switch to MQTT (EMQX already running, more reliable)
**Impact:** Solves `ECONNREFUSED 127.0.0.1:9092` errors

## Issue #3: Services Not Responding on Ports
**Problem:** Services start but health checks fail, unclear if they're ready
**Solution:** 
- Add standardized /health endpoints to all services
- Add startup verification script that checks all ports
- Implement health check in docker-compose for each service
**Impact:** Clear visibility into service status

## Implementation Plan
1. Create Prisma migrations and commit
2. Add /health endpoints to all backend services
3. Add health checks to docker-compose.yml
4. Create startup verification script
5. Add retry logic to Kafka clients
