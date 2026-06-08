# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json turbo.json ./
COPY backend/shared/types/package.json               ./backend/shared/types/
COPY backend/shared/kafka/package.json               ./backend/shared/kafka/
COPY backend/services/websocket-hub/package.json     ./backend/services/websocket-hub/

RUN npm ci --workspaces --include-workspace-root

COPY backend/shared ./backend/shared
COPY backend/services/websocket-hub ./backend/services/websocket-hub

RUN npm run build --workspace=@ebike/types
RUN npm run build --workspace=@ebike/kafka
RUN npm run build --workspace=@ebike/websocket-hub

# ── Runtime image ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

COPY --from=builder /app/backend/services/websocket-hub/dist ./dist
COPY --from=builder /app/backend/services/websocket-hub/package.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 3008
CMD ["node", "dist/index.js"]
