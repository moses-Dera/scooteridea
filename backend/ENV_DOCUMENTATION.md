# Backend Environment Variables Documentation

This file explains every environment variable used in the backend services.

---

## 🗄️ Database & Persistence

### `DATABASE_URL`

**Purpose:** PostgreSQL connection string  
**Format:** `postgresql://user:password@host:port/database`  
**Required:** Yes  
**Default:** `postgresql://ebike:secret@localhost:5432/ebike`  
**Used by:** All services (via `@ebike/db` / Prisma)

```env
DATABASE_URL=postgresql://ebike:secret@localhost:5432/ebike
```

For production, use a managed database (e.g., GCP Cloud SQL):

```env
DATABASE_URL=postgresql://username:password@your-instance.c.your-project.internal:5432/ebike
```

---

### `REDIS_URL`

**Purpose:** Redis connection string for caching, sessions, geospatial queries  
**Format:** `redis://host:port` or `redis://:password@host:port`  
**Required:** Yes  
**Default:** `redis://localhost:6379`  
**Used by:** Fleet Service, Matching Service, Pricing Service, WebSocket Hub

```env
REDIS_URL=redis://localhost:6379
```

For production with authentication:

```env
REDIS_URL=redis://:your-password@your-redis-instance.com:6379
```

---

## 🚀 Message Queues & Real-Time

### `KAFKA_BROKERS`

**Purpose:** Comma-separated list of Kafka broker addresses  
**Format:** `host1:port1,host2:port2,...`  
**Required:** Yes  
**Default:** `localhost:9092`  
**Used by:** All services (event-driven communication)

```env
KAFKA_BROKERS=localhost:9092
```

For production (managed Kafka):

```env
KAFKA_BROKERS=broker1.your-kafka.com:9092,broker2.your-kafka.com:9092,broker3.your-kafka.com:9092
```

### `KAFKA_GROUP_ID`

**Purpose:** Consumer group ID for Kafka topic subscriptions  
**Format:** String  
**Required:** Yes  
**Default:** `ebike-backend`  
**Used by:** Services consuming events

```env
KAFKA_GROUP_ID=ebike-backend
```

### `KAFKA_CLIENT_ID`

**Purpose:** Client identifier for Kafka producer  
**Format:** String  
**Required:** Yes  
**Default:** `ebike-service`  
**Used by:** All services producing events

```env
KAFKA_CLIENT_ID=ebike-service
```

---

### `MQTT_BROKER_URL`

**Purpose:** MQTT broker for IoT bike/dock telemetry  
**Format:** `mqtt://host:port` or `mqtts://host:port` (secure)  
**Required:** Yes  
**Default:** `mqtt://localhost:1883`  
**Used by:** Fleet Service, Dock Service

```env
MQTT_BROKER_URL=mqtt://localhost:1883
```

For production (EMQX Cloud):

```env
MQTT_BROKER_URL=mqtts://your-emqx-instance.emqxcloud.com:8883
```

### `MQTT_USERNAME`

**Purpose:** Username to authenticate with MQTT broker  
**Format:** String  
**Required:** Yes  
**Default:** `backend`  
**Used by:** Fleet Service, Dock Service

```env
MQTT_USERNAME=backend
```

### `MQTT_PASSWORD`

**Purpose:** Password to authenticate with MQTT broker  
**Format:** String  
**Required:** Yes  
**Default:** `change_me` (must be changed!)  
**Used by:** Fleet Service, Dock Service

```env
MQTT_PASSWORD=your-secure-password
```

---

## 🔐 Authentication & Tokens

### `JWT_ACCESS_SECRET`

**Purpose:** Secret key for signing JWT access tokens  
**Format:** String (at least 32 characters recommended)  
**Required:** Yes  
**Default:** `your-rs256-or-hs256-secret-here`  
**Used by:** Auth Service, all middleware

Generate a strong secret:

```bash
openssl rand -base64 32
```

```env
JWT_ACCESS_SECRET=your-32-character-secret-key-here
```

**⚠️ IMPORTANT:** Use a different secret in production. Change this value!

### `JWT_REFRESH_SECRET`

**Purpose:** Secret key for signing JWT refresh tokens  
**Format:** String (at least 32 characters recommended)  
**Required:** Yes  
**Default:** `your-refresh-secret-here`  
**Used by:** Auth Service

```env
JWT_REFRESH_SECRET=your-refresh-secret-different-from-access
```

### `JWT_ACCESS_EXPIRY`

**Purpose:** Lifetime of access tokens before they expire  
**Format:** Duration string (`15m`, `24h`, `7d`)  
**Required:** Yes  
**Default:** `15m`  
**Used by:** Auth Service

```env
JWT_ACCESS_EXPIRY=15m
```

Recommended: 15 minutes for security

### `JWT_REFRESH_EXPIRY`

**Purpose:** Lifetime of refresh tokens  
**Format:** Duration string (`7d`, `30d`, `90d`)  
**Required:** Yes  
**Default:** `30d`  
**Used by:** Auth Service

```env
JWT_REFRESH_EXPIRY=30d
```

---

## 💳 Payment Processing

### `STRIPE_SECRET_KEY`

**Purpose:** Stripe API key for processing credit card payments  
**Format:** `sk_live_...` (production) or `sk_test_...` (testing)  
**Required:** Only if accepting Stripe payments  
**Default:** None  
**Used by:** Payment Service

Get from [Stripe Dashboard](https://dashboard.stripe.com/apikeys):

```env
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_TEST_KEY
```

For production:

```env
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_LIVE_KEY
```

### `PAYSTACK_SECRET_KEY`

**Purpose:** Paystack API key for African payments (Nigeria, Kenya, etc.)  
**Format:** `sk_test_...` (testing) or `sk_live_...` (production)  
**Required:** Only if accepting Paystack payments  
**Default:** None  
**Used by:** Payment Service

Get from [Paystack Dashboard](https://dashboard.paystack.com/):

```env
PAYSTACK_SECRET_KEY=sk_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## 🗺️ Mapping & Location Services

### `MAPBOX_ACCESS_TOKEN`

**Purpose:** Mapbox API token for maps, routing, and geocoding  
**Format:** `pk.eyJ1...` (public token)  
**Required:** Yes (for operator dashboard)  
**Default:** None  
**Used by:** Frontend + Pricing Service (route calculations)

Get from [Mapbox Dashboard](https://account.mapbox.com/tokens/):

```env
MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjaTExMTExMTExMTExMTExMTExMTExMTExIn0.xxxxx
```

---

## ☁️ Google Cloud Platform (GCP)

### `GCP_PROJECT_ID`

**Purpose:** GCP project identifier for deployment and services  
**Format:** `project-name-123456`  
**Required:** Only for GCP deployments  
**Default:** None  
**Used by:** Cloud Run, Cloud Storage, Cloud Logging

```env
GCP_PROJECT_ID=ebike-platform-prod
```

### `GCP_REGION`

**Purpose:** GCP region for deploying services and storing data  
**Format:** `us-central1`, `africa-south1`, `europe-west1`, etc.  
**Required:** Only for GCP deployments  
**Default:** `africa-south1` (Lagos, Nigeria)  
**Used by:** Cloud Run, Cloud Storage

```env
GCP_REGION=africa-south1
```

Recommended for East African operations:

```env
GCP_REGION=africa-south1
```

---

## 🔗 OAuth (Social Login)

### `GOOGLE_CLIENT_ID`

**Purpose:** Google OAuth client ID for sign-in with Google  
**Format:** `123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com`  
**Required:** Only if enabling Google OAuth  
**Default:** None  
**Used by:** Auth Service

Get from [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials:

```env
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
```

---

## 🔔 Notifications

### `EXPO_ACCESS_TOKEN`

**Purpose:** Expo Push Notifications token for sending push notifications to mobile apps  
**Format:** Expo access token  
**Required:** Only if using Expo for push notifications  
**Default:** None  
**Used by:** Notification Service

Get from [Expo Dashboard](https://expo.dev) → Account → Access Tokens:

```env
EXPO_ACCESS_TOKEN=ExponentPushToken[xxxxxxxxxxxxxxxxxxxxx]
```

---

## 🎯 Service Ports

Each microservice runs on its own port. Typically, you don't need to change these unless you have port conflicts.

```env
AUTH_PORT=3001
FLEET_PORT=3002
RIDE_PORT=3003

PRICING_PORT=3005
PAYMENT_PORT=3006
NOTIFICATION_PORT=3007
WS_HUB_PORT=3008
DOCK_PORT=3009
```

---

## 🔄 CORS (Cross-Origin Resource Sharing)

### `CORS_ORIGINS`

**Purpose:** Comma-separated list of frontend URLs allowed to call backend APIs  
**Format:** `http://host:port,http://host2:port2`  
**Required:** Yes  
**Default:** `http://localhost:3000,http://localhost:4000`  
**Used by:** API Gateway, all services

For local development:

```env
CORS_ORIGINS=http://localhost:3000,http://localhost:4000
```

For production:

```env
CORS_ORIGINS=https://app.scooteridea.com,https://operator.scooteridea.com
```

---

## 🏗️ Quick Reference

### Minimal Setup (Local Development)

Copy and paste into `.env`:

```env
DATABASE_URL=postgresql://ebike:secret@localhost:5432/ebike
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
KAFKA_GROUP_ID=ebike-backend
KAFKA_CLIENT_ID=ebike-service
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=backend
MQTT_PASSWORD=change_me
JWT_ACCESS_SECRET=your-32-character-secret-key-here-change-me
JWT_REFRESH_SECRET=your-refresh-secret-different-from-access
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d
MAPBOX_ACCESS_TOKEN=pk.eyJ1...
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
CORS_ORIGINS=http://localhost:3000,http://localhost:4000
```

### Production Setup Checklist

- [ ] Use strong, unique JWT secrets (32+ characters)
- [ ] Rotate secrets every 90 days
- [ ] Use managed database (GCP Cloud SQL, AWS RDS)
- [ ] Use managed Redis (GCP Memorystore, AWS ElastiCache)
- [ ] Enable SSL/TLS for MQTT (`mqtts://`)
- [ ] Set `CORS_ORIGINS` to your actual domains
- [ ] Store secrets in secure vault (GCP Secret Manager, AWS Secrets Manager)
- [ ] Enable monitoring and alerting
- [ ] Set appropriate token expiry times (shorter for security)

---

## 🆘 Troubleshooting

### "Redis connection refused"

Check `REDIS_URL` is correct and Redis is running:

```bash
docker ps | grep redis
redis-cli ping
```

### "Kafka broker not available"

Check `KAFKA_BROKERS` and Kafka is running:

```bash
docker ps | grep kafka
```

### "MQTT connection timeout"

Check `MQTT_BROKER_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD`:

```bash
mosquitto_sub -h localhost -u backend -P change_me -t '#'
```

### "JWT token invalid"

Ensure `JWT_ACCESS_SECRET` matches across all services. If changed, users must re-login.

---

**Questions?** See `backend/README.md` or open an issue.
