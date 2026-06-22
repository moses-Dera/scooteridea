#!/bin/bash

# 🔍 Comprehensive Startup Verification Script
# Checks all services, ports, and dependencies are ready

set -e

RESET='\033[0m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'

echo -e "${BLUE}========================================${RESET}"
echo -e "${BLUE}🔍 System Startup Verification${RESET}"
echo -e "${BLUE}========================================${RESET}"

CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Function to check a port
check_port() {
  local port=$1
  local service=$2
  local timeout=2
  
  if timeout $timeout bash -c "echo > /dev/tcp/127.0.0.1/$port" 2>/dev/null; then
    echo -e "${GREEN}✅${RESET} $service (port $port) - LISTENING"
    ((CHECKS_PASSED++))
    return 0
  else
    echo -e "${RED}❌${RESET} $service (port $port) - NOT RESPONDING"
    ((CHECKS_FAILED++))
    return 1
  fi
}

# Function to check HTTP health endpoint
check_health() {
  local url=$1
  local service=$2
  
  response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$url" 2>/dev/null || echo "000")
  
  if [ "$response" = "200" ] || [ "$response" = "204" ]; then
    echo -e "${GREEN}✅${RESET} $service - HEALTHY"
    ((CHECKS_PASSED++))
    return 0
  else
    echo -e "${YELLOW}⚠️${RESET}  $service - Status: $response"
    ((CHECKS_WARNING++))
    return 1
  fi
}

# Function to check Docker container
check_container() {
  local container=$1
  
  if docker ps --format "{{.Names}}" | grep -q "^$container$"; then
    status=$(docker ps --filter "name=$container" --format "{{.Status}}")
    echo -e "${GREEN}✅${RESET} $container - UP (${status})"
    ((CHECKS_PASSED++))
    return 0
  else
    echo -e "${RED}❌${RESET} $container - DOWN or NOT FOUND"
    ((CHECKS_FAILED++))
    return 1
  fi
}

echo -e "\n${BLUE}📦 Docker Infrastructure${RESET}"
check_container "infra-postgres-1"
check_container "infra-redis-1"
check_container "infra-kafka-1"
check_container "infra-zookeeper-1"
check_container "infra-emqx-1"

echo -e "\n${BLUE}🚀 Backend Services${RESET}"
check_port 3004 "Auth Service"
check_port 3005 "Fleet Service"
check_port 3006 "Payment Service"
check_port 3007 "Ride Service"
check_port 3008 "Notification Service"
check_port 3009 "WebSocket Hub"

echo -e "\n${BLUE}🎨 Frontend Applications${RESET}"
check_port 3000 "Rider App"
check_port 3010 "Rider Web"
check_port 4000 "Admin Dashboard"

echo -e "\n${BLUE}🔗 Service Health Checks${RESET}"
check_health "http://localhost:3004/health" "Auth Service Health"
check_health "http://localhost:3005/health" "Fleet Service Health"
check_health "http://localhost:3006/health" "Payment Service Health"

echo -e "\n${BLUE}📊 Database${RESET}"
if docker exec infra-postgres-1 psql -U postgres -d ebike -c "SELECT 1" >/dev/null 2>&1; then
  echo -e "${GREEN}✅${RESET} PostgreSQL - CONNECTED"
  ((CHECKS_PASSED++))
else
  echo -e "${RED}❌${RESET} PostgreSQL - CONNECTION FAILED"
  ((CHECKS_FAILED++))
fi

echo -e "\n${BLUE}📬 Message Brokers${RESET}"
if docker exec infra-kafka-1 kafka-broker-api-versions.sh --bootstrap-server localhost:9092 >/dev/null 2>&1; then
  echo -e "${GREEN}✅${RESET} Kafka - READY"
  ((CHECKS_PASSED++))
else
  echo -e "${YELLOW}⚠️${RESET}  Kafka - Not responding (may be initializing)"
  ((CHECKS_WARNING++))
fi

if docker exec infra-emqx-1 emqx_ctl broker info >/dev/null 2>&1; then
  echo -e "${GREEN}✅${RESET} EMQX/MQTT - READY"
  ((CHECKS_PASSED++))
else
  echo -e "${YELLOW}⚠️${RESET}  EMQX/MQTT - Not responding"
  ((CHECKS_WARNING++))
fi

# Summary
echo -e "\n${BLUE}========================================${RESET}"
echo -e "${BLUE}📊 Summary${RESET}"
echo -e "${BLUE}========================================${RESET}"
echo -e "${GREEN}✅ Passed:${RESET}  $CHECKS_PASSED"
echo -e "${YELLOW}⚠️  Warnings:${RESET} $CHECKS_WARNING"
echo -e "${RED}❌ Failed:${RESET}  $CHECKS_FAILED"

if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}🎉 All critical services are up!${RESET}"
  exit 0
else
  echo -e "\n${RED}⚠️  Some services are not responding. Check logs:${RESET}"
  echo "  - Backend: tail -f /tmp/engine_run*.log"
  echo "  - Docker: docker compose -f backend/infra/docker-compose.yml logs"
  exit 1
fi
