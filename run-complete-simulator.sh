#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd /home/moze/codes/scooteridea

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🚲  E-Bike Simulator - Complete Start${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Step 1: Check/Start MQTT
echo -e "${YELLOW}Step 1: Checking MQTT Broker...${NC}"
if ! nc -z localhost 1883 2>/dev/null; then
  echo -e "${YELLOW}Starting MQTT with Docker...${NC}"
  docker run -d -p 1883:1883 --name mqtt-broker eclipse-mosquitto >/dev/null 2>&1 || echo -e "${YELLOW}MQTT container already running${NC}"
  sleep 2
fi

if nc -z localhost 1883 2>/dev/null; then
  echo -e "${GREEN}✓ MQTT ready on port 1883${NC}\n"
else
  echo -e "${RED}✗ MQTT not available${NC}"
  exit 1
fi

# Step 2: Install dependencies
echo -e "${YELLOW}Step 2: Installing dependencies...${NC}"
cd simulator
npm install >/dev/null 2>&1
echo -e "${GREEN}✓ Dependencies installed${NC}\n"

# Step 3: Start Simulator API
echo -e "${YELLOW}Step 3: Starting Simulator API (port 8885)...${NC}"
node simulator-api.js > /tmp/simulator-api.log 2>&1 &
API_PID=$!
echo "API PID: $API_PID" >> /tmp/simulator.pids

sleep 3

# Check if API started
if ! nc -z localhost 8885 2>/dev/null; then
  echo -e "${RED}✗ Simulator API failed to start${NC}"
  echo -e "${YELLOW}Logs:${NC}"
  tail -20 /tmp/simulator-api.log
  exit 1
fi
echo -e "${GREEN}✓ Simulator API running on port 8885${NC}\n"

# Step 4: Start Dashboard
echo -e "${YELLOW}Step 4: Starting Dashboard (port 3001)...${NC}"
cd ../packages/simulator-dashboard
npm install >/dev/null 2>&1
npm run dev > /tmp/dashboard.log 2>&1 &
DASH_PID=$!
echo "DASH PID: $DASH_PID" >> /tmp/simulator.pids

sleep 4
echo -e "${GREEN}✓ Dashboard starting on port 3001${NC}\n"

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ All systems ready!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${GREEN}�� Access Points:${NC}"
echo -e "  Dashboard:      ${YELLOW}http://localhost:3001${NC}"
echo -e "  WebSocket API:  ${YELLOW}ws://localhost:8885${NC}"
echo -e "  MQTT Broker:    ${YELLOW}mqtt://localhost:1883${NC}\n"

echo -e "${GREEN}📊 Features:${NC}"
echo -e "  • Add/remove test bikes"
echo -e "  • Control bikes (unlock, lock, disable)"
echo -e "  • Monitor real-time GPS & battery"
echo -e "  • Manage docking stations\n"

echo -e "${YELLOW}Logs:${NC}"
echo -e "  API:       tail -f /tmp/simulator-api.log"
echo -e "  Dashboard: tail -f /tmp/dashboard.log\n"

echo -e "${YELLOW}To stop all services:${NC}"
echo -e "  kill $API_PID $DASH_PID\n"

# Show API logs
tail -f /tmp/simulator-api.log &
TAIL_PID=$!

# Cleanup on exit
trap "kill $API_PID $DASH_PID $TAIL_PID 2>/dev/null; rm -f /tmp/simulator.pids; exit 0" INT

# Keep running
wait $API_PID $DASH_PID
