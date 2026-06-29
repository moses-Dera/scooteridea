# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY backend/shared/types/package.json       ./backend/shared/types/
COPY backend/shared/core/package.json        ./backend/shared/core/
COPY backend/shared/redis/package.json       ./backend/shared/redis/
COPY backend/shared/events/package.json      ./backend/shared/events/
COPY backend/shared/mqtt/package.json        ./backend/shared/mqtt/
COPY backend/shared/db/package.json          ./backend/shared/db/
COPY backend/services/ride/package.json      ./backend/services/ride/

RUN npm install -g typescript
RUN npm ci --workspaces --include-workspace-root
COPY backend/shared ./backend/shared
COPY backend/services/ride ./backend/services/ride

RUN npm run build --workspace=@ebike/types
RUN npm run build --workspace=@ebike/core
RUN npm run build --workspace=@ebike/redis
RUN npm run build --workspace=@ebike/events
RUN npm run build --workspace=@ebike/mqtt
RUN npm run db:generate --workspace=@ebike/db
RUN npm run build --workspace=@ebike/db
RUN npm run build --workspace=@ebike/ride-service

# ── Runtime image ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

COPY --from=builder /app/backend/services/ride/dist ./dist
COPY --from=builder /app/backend/services/ride/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/shared ./backend/shared
ENV NODE_ENV=production
EXPOSE 3003
CMD ["node", "dist/index.js"]
