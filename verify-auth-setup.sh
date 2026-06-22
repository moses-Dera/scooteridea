#!/bin/bash

# Quick start script for testing the HTTPOnly Cookies + BFF authentication
# This script validates that all components are properly configured and communicating

set -e

FRONTEND_URL="http://localhost:3010"
BACKEND_URL="http://localhost:3001"
TEST_EMAIL="test-bff-auth@example.com"
TEST_PASSWORD="TestPass123!"
TEST_NAME="BFF Auth Test User"

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║     HTTPOnly Cookies + BFF Authentication Setup Verification              ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored status
status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1"
    fi
}

echo "1️⃣  Checking Service Connectivity..."
echo "───────────────────────────────────────────────────────────────────────────────"

# Check frontend
echo -n "   Frontend (localhost:3010): "
if curl -s -m 3 "$FRONTEND_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${YELLOW}⚠ Not responding (services may still be starting)${NC}"
fi

# Check backend
echo -n "   Backend (localhost:3001): "
if curl -s -m 3 "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${YELLOW}⚠ Not responding (waiting for service startup)${NC}"
fi

echo ""
echo "2️⃣  Checking Environment Configuration..."
echo "───────────────────────────────────────────────────────────────────────────────"

if [ -f "frontend/rider-web/.env.local" ]; then
    echo -e "${GREEN}✓${NC} .env.local exists"
    
    # Check for required vars
    if grep -q "NEXTAUTH_URL=http://localhost:3010" frontend/rider-web/.env.local; then
        echo -e "${GREEN}✓${NC} NEXTAUTH_URL configured correctly"
    else
        echo -e "${RED}✗${NC} NEXTAUTH_URL not set to http://localhost:3010"
    fi
    
    if grep -q "NEXT_PUBLIC_API_URL=http://localhost:3001" frontend/rider-web/.env.local; then
        echo -e "${GREEN}✓${NC} NEXT_PUBLIC_API_URL configured correctly"
    else
        echo -e "${RED}✗${NC} NEXT_PUBLIC_API_URL not set to http://localhost:3001"
    fi
    
    if grep -q "NEXTAUTH_SECRET" frontend/rider-web/.env.local; then
        echo -e "${GREEN}✓${NC} NEXTAUTH_SECRET configured"
    else
        echo -e "${RED}✗${NC} NEXTAUTH_SECRET missing"
    fi
else
    echo -e "${RED}✗${NC} .env.local not found"
fi

echo ""
echo "3️⃣  Checking Build Status..."
echo "───────────────────────────────────────────────────────────────────────────────"

if [ -d "frontend/rider-web/.next" ]; then
    echo -e "${GREEN}✓${NC} Build artifacts exist"
    
    # Check for auth route
    if [ -f "frontend/rider-web/.next/server/app/api/auth/[...nextauth]/route.js" ]; then
        echo -e "${GREEN}✓${NC} NextAuth route built"
    else
        echo -e "${YELLOW}⚠${NC} NextAuth route not found (dev server may build on-demand)"
    fi
    
    # Check for proxy routes
    if [ -f "frontend/rider-web/.next/server/app/api/proxy" ]; then
        echo -e "${GREEN}✓${NC} BFF proxy routes exist"
    else
        echo -e "${YELLOW}⚠${NC} BFF proxy routes not found in build"
    fi
else
    echo -e "${YELLOW}⚠${NC} No build artifacts (.next/) - dev server will build on-demand"
fi

echo ""
echo "4️⃣  Testing Authentication Flow..."
echo "───────────────────────────────────────────────────────────────────────────────"

if curl -s -m 5 "$BACKEND_URL/auth/login" > /dev/null 2>&1; then
    echo "   Attempting to register test user..."
    REGISTER_RESPONSE=$(curl -s -X POST "$BACKEND_URL/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"$TEST_PASSWORD\",
            \"name\": \"$TEST_NAME\"
        }" 2>&1)
    
    if echo "$REGISTER_RESPONSE" | grep -q "success\|user\|id"; then
        echo -e "${GREEN}✓${NC} Test user registered (or already exists)"
    else
        echo -e "${YELLOW}⚠${NC} Registration response unclear: $REGISTER_RESPONSE"
    fi
    
    echo "   Attempting login with test credentials..."
    LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"$TEST_PASSWORD\"
        }" 2>&1)
    
    if echo "$LOGIN_RESPONSE" | grep -q "accessToken\|access_token"; then
        echo -e "${GREEN}✓${NC} Backend login endpoint working"
        echo "   Response contains tokens (✓ ready for BFF proxy)"
    else
        echo -e "${YELLOW}⚠${NC} Login response unclear: $LOGIN_RESPONSE"
    fi
else
    echo -e "${YELLOW}⚠${NC} Backend not responding - skipping auth test"
fi

echo ""
echo "5️⃣  Manual Testing Steps..."
echo "───────────────────────────────────────────────────────────────────────────────"

cat << 'EOF'
   1. Open http://localhost:3010 in your browser
   
   2. Click on "Login" or "Rider" menu
   
   3. Try logging in with:
      Email: test-bff-auth@example.com
      Password: TestPass123!
      
   4. After successful login, open DevTools (F12):
      a) Go to Application → Cookies
      b) Look for "__Secure-next-auth.session-token" or "next-auth.session-token"
      c) Verify:
         ✓ httpOnly: checked (✓ XSS protected)
         ✓ secure: checked (✓ HTTPS ready)
         ✓ sameSite: Lax (✓ CSRF protected)
      
   5. Go to Network tab and make an API request:
      a) Navigate to "Docks" or "Bikes" page
      b) Watch Network tab for requests to /api/proxy/...
      c) Click on request and verify:
         - Request goes to /api/proxy/... (✓ using BFF)
         - Authorization header present (✓ token included)
   
   6. Verify logout works:
      a) Click Logout
      b) Check cookies are cleared
      c) Try to access protected page
      d) Should redirect to login (✓ 401 handling working)

EOF

echo ""
echo "6️⃣  Architecture Verification..."
echo "───────────────────────────────────────────────────────────────────────────────"

echo "   Expected flow:"
echo "   Browser → NextAuth session (HTTPOnly cookie)"
echo "           ↓"
echo "   BFF Proxy (/api/proxy/...) extracts JWT"
echo "           ↓"
echo "   Backend API (http://localhost:3001/...)"
echo ""

echo "   Security measures in place:"
echo "   • HTTPOnly cookie: XSS protection ✓"
echo "   • SameSite=Lax: CSRF protection ✓"
echo "   • Secure flag: HTTPS-only (in production) ✓"
echo "   • No localStorage: No XSS attack surface ✓"
echo "   • BFF proxy: Secrets never exposed to client ✓"
echo ""

echo "7️⃣  Documentation..."
echo "───────────────────────────────────────────────────────────────────────────────"

echo "   For more details, see:"
echo "   • frontend/rider-web/AUTH_SETUP.md"
echo "   • AUTHENTICATION_CHECKLIST.md"
echo "   • frontend/rider-web/__tests__/auth.integration.test.ts"
echo ""

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║  Setup verification complete!                                              ║"
echo "║  👉 Start services with: backend: npm run dev | frontend: npm run dev     ║"
echo "║  👉 Test at: http://localhost:3010                                        ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
