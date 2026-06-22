#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🚲  E-Bike Simulator Dashboard Startup  ${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if MQTT is running
echo -e "${YELLOW}Checking MQTT broker...${NC}"
if ! lsof -i :1883 > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  MQTT broker not running on port 1883${NC}"
  echo -e "${YELLOW}Starting mosquitto...${NC}"
  
  # Try to start mosquitto based on OS
  if command -v brew &> /dev/null; then
    # macOS
    brew services start mosquitto
  elif command -v systemctl &> /dev/null; then
    # Linux
    sudo systemctl start mosquitto
  elif command -v mosquitto &> /dev/null; then
    # Direct run (will run in background)
    mosquitto -d
  else
    echo -e "${YELLOW}Please install MQTT broker first:${NC}"
    echo -e "  macOS: brew install mosquitto"
    echo -e "  Ubuntu: sudo apt-get install mosquitto"
    exit 1
  fi
  
  sleep 2
  echo -e "${GREEN}✓ MQTT broker started${NC}\n"
else
  echo -e "${GREEN}✓ MQTT broker already running${NC}\n"
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
  echo -e "${YELLOW}⚠️  Simulator API failed to start. Check logs:${NC}"
  cat /tmp/simulator-api.log
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
  echo -e "${YELLOW}⚠️  Dashboard failed to start. Check logs:${NC}"
  cat /tmp/dashboard.log
  exit 1
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 Everything Started Successfully!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${GREEN}📊 Dashboard: ${YELLOW}http://localhost:3001${NC}"
echo -e "${GREEN}🔌 Simulator API: ${YELLOW}ws://localhost:8885${NC}"
echo -e "${GREEN}📡 MQTT Broker: ${YELLOW}mqtt://localhost:1883${NC}"
echo -e "${GREEN}🚀 Backend API: ${YELLOW}http://localhost:3000${NC}"
echo -e "${GREEN}🎮 Rider App: ${YELLOW}http://localhost:3000${NC}\n"

echo -e "${YELLOW}Process IDs:${NC}"
echo -e "  Simulator API: $SIM_PID"
echo -e "  Dashboard: $DASH_PID\n"

echo -e "${YELLOW}Logs:${NC}"
echo -e "  Simulator: tail -f /tmp/simulator-api.log"
echo -e "  Dashboard: tail -f /tmp/dashboard.log\n"

echo -e "${YELLOW}To stop all services:${NC}"
echo -e "  kill $SIM_PID $DASH_PID\n"

echo -e "${BLUE}Ready to test ride booking! 🎊${NC}"

# Keep script running so processes don't exit
wait
