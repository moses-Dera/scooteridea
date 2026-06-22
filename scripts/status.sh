#!/bin/bash

# 🔍 Pre-flight Health Check
# Check ALL systems are active BEFORE starting
# Usage: npm run status

set -e

RESET='\033[0m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'

echo -e "${BLUE}╔════════════════════════════════════════╗${RESET}"
echo -e "${BLUE}║  🔍 Pre-Flight Health Check           ║${RESET}"
echo -e "${BLUE}╚════════════════════════════════════════╝${RESET}\n"

CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to check a port
check_service() {
  local port=$1
  local service=$2
  local timeout=1
  
  if timeout $timeout bash -c "echo > /dev/tcp/127.0.0.1/$port" 2>/dev/null; then
    echo -e "${GREEN}✅${RESET} $service (port $port)"
    ((CHECKS_PASSED++))
    return 0
  else
    echo -e "${RED}❌${RESET} $service (port $port) - NOT RESPONDING"
    ((CHECKS_FAILED++))
    return 1
  fi
}

# Function to check Docker container
check_container() {
  local container=$1
  local service=$2
  
  if docker ps --format "{{.Names}}" | grep -q "^$container$"; then
    status=$(docker ps --filter "name=$container" --format "{{.Status}}" | cut -d' ' -f1-3)
    echo -e "${GREEN}✅${RESET} $service - ${status}"
    ((CHECKS_PASSED++))
    return 0
  else
    echo -e "${RED}❌${RESET} $service - STOPPED"
    ((CHECKS_FAILED++))
    return 1
  fi
}

echo -e "${BLUE}📦 Docker Infrastructure:${RESET}"
check_container "infra-postgres-1" "PostgreSQL"
check_container "infra-redis-1" "Redis"
check_container "infra-kafka-1" "Kafka"
check_container "infra-zookeeper-1" "Zookeeper"
check_container "infra-emqx-1" "MQTT/EMQX"

echo -e "\n${BLUE}🚀 Backend Services:${RESET}"
check_service 3004 "Auth Service"
check_service 3005 "Fleet Service"
check_service 3006 "Payment Service"
check_service 3007 "Ride Service"
check_service 3008 "Notification Service"
check_service 3009 "WebSocket Hub"

echo -e "\n${BLUE}🎨 Frontend Applications:${RESET}"
check_service 3000 "Rider App"
check_service 3010 "Rider Web"
check_service 4000 "Admin Dashboard"

echo -e "\n${BLUE}════════════════════════════════════════${RESET}"
echo -e "${BLUE}📊 Summary${RESET}"
echo -e "${BLUE}════════════════════════════════════════${RESET}"
echo -e "${GREEN}✅ Running:${RESET}  $CHECKS_PASSED"
echo -e "${RED}❌ Stopped:${RESET}  $CHECKS_FAILED"

if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}🎉 All services are ACTIVE!${RESET}"
  echo -e "${GREEN}System is ready to use.${RESET}\n"
  exit 0
else
  echo -e "\n${YELLOW}⚠️  Some services are NOT running.${RESET}"
  echo -e "\n${BLUE}To start everything:${RESET}"
  echo -e "  ${BLUE}npm run all${RESET}"
  echo -e "\nTo start Docker infrastructure only:"
  echo -e "  ${BLUE}npm run docker:up${RESET}"
  echo -e "\nTo clean up and restart:"
  echo -e "  ${BLUE}npm run cleanup${RESET}"
  echo -e "  ${BLUE}npm run all${RESET}\n"
  exit 1
fi
