#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🚲  E-Bike Simulator Dashboard Startup  ${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if MQTT is running
echo -e "${YELLOW}Checking MQTT broker...${NC}"
MQTT_RUNNING=0

if lsof -i :1883 > /dev/null 2>&1; then
  echo -e "${GREEN}✓ MQTT broker already running on port 1883${NC}\n"
  MQTT_RUNNING=1
else
  echo -e "${YELLOW}⚠️  MQTT broker not running on port 1883${NC}"
  echo -e "${YELLOW}Attempting to start mosquitto...${NC}"
  
  if command -v mosquitto &> /dev/null; then
    # Start mosquitto in background without sudo
    mosquitto -d 2>/dev/null
    sleep 2
    
    if lsof -i :1883 > /dev/null 2>&1; then
      echo -e "${GREEN}✓ MQTT broker started successfully${NC}\n"
      MQTT_RUNNING=1
    else
      echo -e "${YELLOW}⚠️  Could not start mosquitto in background${NC}"
      echo -e "${YELLOW}   Try running in another terminal: ${NC}mosquitto${NC}\n"
    fi
  else
    echo -e "${RED}✗ Mosquitto not installed${NC}"
    echo -e "${YELLOW}Install with:${NC}"
    echo -e "  Ubuntu/Debian: sudo apt-get install -y mosquitto"
    echo -e "  macOS: brew install mosquitto${NC}\n"
  fi
fi

# Navigate to root
cd /home/moze/codes/scooteridea

# Start simulator API in background
echo -e "${YELLOW}Starting Simulator API...${NC}"
cd simulator
npm run api > /tmp/simulator-api.log 2>&1 &
SIM_PID=$!
echo -e "${GREEN}✓ Simulator API running (PID: $SIM_PID)${NC}"
sleep 2

# Check if simulator API started successfully
if ! kill -0 $SIM_PID 2>/dev/null; then
  echo -e "${RED}✗ Simulator API failed to start${NC}"
  echo -e "${YELLOW}Check logs: cat /tmp/simulator-api.log${NC}"
  exit 1
fi

# Navigate to dashboard
cd ../packages/simulator-dashboard

# Start dashboard in background
echo -e "${YELLOW}Starting Dashboard...${NC}"
npm run dev > /tmp/dashboard.log 2>&1 &
DASH_PID=$!
echo -e "${GREEN}✓ Dashboard running (PID: $DASH_PID)${NC}"
sleep 3

# Check if dashboard started successfully
if ! kill -0 $DASH_PID 2>/dev/null; then
  echo -e "${RED}✗ Dashboard failed to start${NC}"
  echo -e "${YELLOW}Check logs: cat /tmp/dashboard.log${NC}"
  exit 1
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 Everything Started Successfully!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${GREEN}📊 Dashboard:${NC}         ${YELLOW}http://localhost:3001${NC}"
echo -e "${GREEN}🔌 Simulator API:${NC}     ${YELLOW}ws://localhost:8885${NC}"
echo -e "${GREEN}📡 MQTT Broker:${NC}      ${YELLOW}mqtt://localhost:1883${NC}"
echo -e "${GREEN}🎮 Rider App:${NC}        ${YELLOW}http://localhost:3000${NC}\n"

echo -e "${YELLOW}Process IDs:${NC}"
echo -e "  Simulator API: $SIM_PID"
echo -e "  Dashboard: $DASH_PID\n"

echo -e "${YELLOW}Logs:${NC}"
echo -e "  Simulator: tail -f /tmp/simulator-api.log"
echo -e "  Dashboard: tail -f /tmp/dashboard.log\n"

echo -e "${YELLOW}To stop all services:${NC}"
echo -e "  kill $SIM_PID $DASH_PID\n"

if [ $MQTT_RUNNING -eq 0 ]; then
  echo -e "${RED}⚠️  MQTT broker is NOT running${NC}"
  echo -e "${YELLOW}Start it in another terminal with:${NC}"
  echo -e "  ${BLUE}mosquitto${NC}\n"
fi

echo -e "${BLUE}Ready to test ride booking! 🎊${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}\n"

# Show live logs
echo -e "${YELLOW}=== Simulator API Log ====${NC}"
tail -f /tmp/simulator-api.log &
TAIL_PID=$!

# Handle Ctrl+C to clean up
trap "kill $SIM_PID $DASH_PID $TAIL_PID 2>/dev/null; exit 0" INT

# Keep script running so processes don't exit
wait
