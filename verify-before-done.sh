#!/bin/bash
#
# BidWin Verification Script
# =========================
# AGENTS MUST RUN THIS BEFORE REPORTING ANY TASK AS DONE
#
# Usage: bash verify-before-done.sh
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "  BidWin Verification Script"
echo "=========================================="
echo ""

FAILED=0

# ------------------------------
# Step 1: Kill old processes
# ------------------------------
echo -e "${YELLOW}[1/8] Killing old processes...${NC}"
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:3001 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:3002 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 2
echo -e "${GREEN}   ✓ Old processes cleaned${NC}"

# ------------------------------
# Step 2: Clear caches
# ------------------------------
echo -e "${YELLOW}[2/8] Clearing caches...${NC}"
rm -rf frontend/.next 2>/dev/null || true
rm -rf frontend/node_modules/.cache 2>/dev/null || true
echo -e "${GREEN}   ✓ Caches cleared${NC}"

# ------------------------------
# Step 3: Install dependencies (if needed)
# ------------------------------
echo -e "${YELLOW}[3/8] Checking dependencies...${NC}"
if [ ! -d "frontend/node_modules" ]; then
    echo "   Installing frontend dependencies..."
    npm --prefix frontend install
fi
echo -e "${GREEN}   ✓ Dependencies OK${NC}"

# ------------------------------
# Step 4: Lint check
# ------------------------------
echo -e "${YELLOW}[4/8] Running lint...${NC}"
if npm --prefix frontend run lint --silent; then
    echo -e "${GREEN}   ✓ Lint passed${NC}"
else
    echo -e "${RED}   ✗ Lint FAILED${NC}"
    FAILED=1
fi

# ------------------------------
# Step 5: TypeScript check
# ------------------------------
echo -e "${YELLOW}[5/8] Running TypeScript check...${NC}"
if npm --prefix frontend run build 2>&1 | head -50; then
    echo -e "${GREEN}   ✓ Build passed${NC}"
else
    echo -e "${RED}   ✗ Build FAILED${NC}"
    FAILED=1
fi

# ------------------------------
# Step 6: Check backend health
# ------------------------------
echo -e "${YELLOW}[6/8] Checking backend...${NC}"
if curl -s http://localhost:8000/health 2>/dev/null | grep -q "ok"; then
    echo -e "${GREEN}   ✓ Backend healthy${NC}"
else
    echo -e "${YELLOW}   ⚠ Backend not running (start with: cd backend && uvicorn app.main:app --reload)${NC}"
fi

# ------------------------------
# Step 7: Start frontend and test
# ------------------------------
echo -e "${YELLOW}[7/8] Starting frontend...${NC}"
npm --prefix frontend run dev > /dev/null 2>&1 &
FRONTEND_PID=$!
echo "   Waiting for frontend to start (15 seconds)..."
sleep 15

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}   ✓ Frontend responding on port 3000${NC}"
else
    echo -e "${RED}   ✗ Frontend NOT responding${NC}"
    FAILED=1
fi

# ------------------------------
# Step 8: Test key pages load
# ------------------------------
echo -e "${YELLOW}[8/8] Testing key pages...${NC}"

test_page() {
    if curl -s "http://localhost:3000$1" > /dev/null 2>&1; then
        echo -e "${GREEN}   ✓ $1 OK${NC}"
    else
        echo -e "${RED}   ✗ $1 FAILED${NC}"
        FAILED=1
    fi
}

test_page "/"
test_page "/opportunities"
test_page "/past-performance"
test_page "/company-profile"

# ------------------------------
# Summary
# ------------------------------
echo ""
echo "=========================================="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}  ✅ ALL CHECKS PASSED${NC}"
    echo "=========================================="
    echo ""
    echo "You may now report your task as DONE."
    echo ""
    echo "Frontend running at: http://localhost:3000"
    echo "Frontend PID: $FRONTEND_PID"
    echo ""
else
    echo -e "${RED}  ❌ SOME CHECKS FAILED${NC}"
    echo "=========================================="
    echo ""
    echo "DO NOT report your task as done."
    echo "Fix the issues above first."
    echo ""
    # Kill the frontend if checks failed
    kill $FRONTEND_PID 2>/dev/null || true
    exit 1
fi
