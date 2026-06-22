#!/bin/bash

# 🚀 One-Command Start & Stop Everything
# Usage: npm run all
# Press Ctrl+C to stop and cleanup

set -e

RESET='\033[0m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'

# Track child processes
CHILD_PIDS=()

# Cleanup function - runs when script exits
cleanup() {
  echo -e "\n${YELLOW}🛑 Stopping all services...${RESET}"
  
  # Kill npm run engine if it's running
  if [ ! -z "$ENGINE_PID" ]; then
    kill $ENGINE_PID 2>/dev/null || true
    wait $ENGINE_PID 2>/dev/null || true
  fi
  
  # Give services time to shutdown gracefully
  sleep 3
  
  # Stop Docker containers
  echo -e "${YELLOW}📦 Stopping Docker containers...${RESET}"
  cd /home/moze/codes/scooteridea
  docker compose -f backend/infra/docker-compose.yml down 2>/dev/null || true
  
  echo -e "${GREEN}✅ All services stopped${RESET}"
  echo -e "${GREEN}✅ Docker cleaned up${RESET}"
  exit 0
}

# Set trap to run cleanup on exit
trap cleanup EXIT INT TERM

echo -e "${BLUE}╔════════════════════════════════════════╗${RESET}"
echo -e "${BLUE}║  🚀 Starting Complete eBike System    ║${RESET}"
echo -e "${BLUE}╚════════════════════════════════════════╝${RESET}"

# Start the engine in background
echo -e "${BLUE}📡 Starting backend services and Docker...${RESET}"
cd /home/moze/codes/scooteridea
npm run engine &
ENGINE_PID=$!

# Wait for infrastructure to be ready
echo -e "${BLUE}⏳ Waiting for Docker services...${RESET}"
sleep 15

# Check MQTT specifically
echo -e "${BLUE}🔍 Waiting for MQTT broker...${RESET}"
for i in {1..30}; do
  if timeout 1 bash -c "echo > /dev/tcp/127.0.0.1/1883" 2>/dev/null; then
    echo -e "${GREEN}✅ MQTT broker ready${RESET}"
    break
  fi
  echo -n "."
  sleep 1
done

# Wait a bit more for services to initialize
echo -e "\n${BLUE}⏳ Waiting for services to initialize (30s more)...${RESET}"
sleep 30

# Run verification
echo -e "\n${BLUE}🔍 Verifying all services...${RESET}\n"
if [ -f ./scripts/verify-startup.sh ]; then
  bash ./scripts/verify-startup.sh
else
  echo -e "${YELLOW}⚠️  Verification script not found${RESET}"
fi

echo -e "\n${GREEN}╔════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}║  ✅ System Ready!                     ║${RESET}"
echo -e "${GREEN}╠════════════════════════════════════════╣${RESET}"
echo -e "${GREEN}║  🎨 Rider App:     http://localhost:3000${RESET}"
echo -e "${GREEN}║  📊 Admin Dashboard: http://localhost:4000${RESET}"
echo -e "${GREEN}║  🗺️  Map Available:  Full Mapbox Integration${RESET}"
echo -e "${GREEN}╠════════════════════════════════════════╣${RESET}"
echo -e "${GREEN}║  Press Ctrl+C to stop and cleanup     ║${RESET}"
echo -e "${GREEN}╚════════════════════════════════════════╝${RESET}\n"

# Wait for engine process
wait $ENGINE_PID 2>/dev/null || true
