#!/bin/bash

# 🧹 Force cleanup all ports and processes
# Usage: npm run cleanup

RESET='\033[0m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'

echo -e "${BLUE}🧹 Force Cleanup - Killing all lingering processes${RESET}\n"

# Kill by port (most reliable method)
PORTS=(3000 3001 3004 3005 3006 3007 3008 3009 3010 4000 5440 6380 1883 9092)

for port in "${PORTS[@]}"; do
  pids=$(lsof -ti:$port 2>/dev/null || true)
  if [ ! -z "$pids" ]; then
    echo -e "${YELLOW}Killing process on port $port${RESET}"
    for pid in $pids; do
      kill -9 $pid 2>/dev/null || true
    done
    echo -e "${GREEN}✅ Port $port freed${RESET}"
  fi
done

# Kill node processes
echo -e "\n${YELLOW}Killing lingering Node processes...${RESET}"
pkill -9 -f "npm run" 2>/dev/null || true
pkill -9 -f "ts-node-dev" 2>/dev/null || true
pkill -9 -f "next dev" 2>/dev/null || true
pkill -9 -f "node.*turbo" 2>/dev/null || true
sleep 2
echo -e "${GREEN}✅ All Node processes killed${RESET}"

# Stop Docker containers
echo -e "\n${YELLOW}Stopping Docker containers...${RESET}"
cd /home/moze/codes/scooteridea
docker compose -f backend/infra/docker-compose.yml down 2>/dev/null || true
sleep 2
echo -e "${GREEN}✅ Docker containers stopped${RESET}"

# Verify ports are free
echo -e "\n${BLUE}Verifying ports are free:${RESET}"
FAILED=0
for port in 3000 3001 3004 3005 3006 3010 4000; do
  if ! timeout 1 bash -c "echo > /dev/tcp/127.0.0.1/$port" 2>/dev/null; then
    echo -e "${GREEN}✅ Port $port - FREE${RESET}"
  else
    echo -e "${RED}❌ Port $port - STILL IN USE${RESET}"
    FAILED=$((FAILED + 1))
  fi
done

if [ $FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✅ Cleanup Complete! All ports are free.${RESET}"
  echo -e "${GREEN}You can now run: npm run all${RESET}\n"
  exit 0
else
  echo -e "\n${RED}⚠️  Some ports are still in use. You may need to reboot.${RESET}\n"
  exit 1
fi
