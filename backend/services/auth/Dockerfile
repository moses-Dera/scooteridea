# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests first for layer-cache efficiency
COPY package.json package-lock.json turbo.json ./
COPY backend/shared/types/package.json       ./backend/shared/types/
COPY backend/shared/core/package.json        ./backend/shared/core/
COPY backend/shared/redis/package.json       ./backend/shared/redis/
COPY backend/shared/events/package.json      ./backend/shared/events/
COPY backend/shared/mqtt/package.json        ./backend/shared/mqtt/
COPY backend/shared/db/package.json          ./backend/shared/db/
COPY backend/services/auth/package.json      ./backend/services/auth/

RUN npm ci --workspaces --include-workspace-root

# Copy source
COPY backend/shared ./backend/shared
COPY backend/services/auth ./backend/services/auth

# Build shared libs then the service
RUN npm run build --workspace=@ebike/types
RUN npm run build --workspace=@ebike/core
RUN npm run build --workspace=@ebike/redis
RUN npm run build --workspace=@ebike/events
RUN npm run build --workspace=@ebike/mqtt
RUN npm run db:generate --workspace=@ebike/db
RUN npm run build --workspace=@ebike/db
RUN npm run build --workspace=@ebike/auth-service

# ── Runtime image ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

COPY --from=builder /app/backend/services/auth/dist ./dist
COPY --from=builder /app/backend/services/auth/package.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
