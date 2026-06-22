# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY backend/shared/types/package.json              ./backend/shared/types/
COPY backend/shared/core/package.json               ./backend/shared/core/
COPY backend/shared/kafka/package.json              ./backend/shared/kafka/
COPY backend/shared/redis/package.json              ./backend/shared/redis/
COPY backend/services/notification/package.json     ./backend/services/notification/

RUN npm ci --workspaces --include-workspace-root

COPY backend/shared ./backend/shared
COPY backend/services/notification ./backend/services/notification

RUN npm run build --workspace=@ebike/types
RUN npm run build --workspace=@ebike/core
RUN npm run build --workspace=@ebike/kafka
RUN npm run build --workspace=@ebike/redis
RUN npm run build --workspace=@ebike/notification-service

# ── Runtime image ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

COPY --from=builder /app/backend/services/notification/dist ./dist
COPY --from=builder /app/backend/services/notification/package.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 3007
CMD ["node", "dist/index.js"]
