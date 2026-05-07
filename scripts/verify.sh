#!/bin/bash

# Hermes Kanban - Verification Script
# Usage: ./scripts/verify.sh

set -e

echo "🔍 Hermes Kanban Verification Script"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

# Check 1: Dependencies
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    pass "node_modules exists"
else
    fail "node_modules missing - run 'pnpm install'"
fi

# Check 2: Environment variables
echo ""
echo "🔐 Checking environment variables..."
if [ -f ".env" ]; then
    pass ".env file exists"
    
    if grep -q "DATABASE_URL" .env; then
        pass "DATABASE_URL configured"
    else
        fail "DATABASE_URL missing in .env"
    fi
    
    if grep -q "BETTER_AUTH_SECRET" .env; then
        pass "BETTER_AUTH_SECRET configured"
    else
        fail "BETTER_AUTH_SECRET missing in .env"
    fi
else
    fail ".env file missing - copy from .env.example"
fi

# Check 3: TypeScript compilation
echo ""
echo "📝 Checking TypeScript..."
if npx tsc --noEmit 2>/dev/null; then
    pass "TypeScript compilation successful"
else
    fail "TypeScript errors found"
fi

# Check 4: Linting
echo ""
echo "🔍 Checking ESLint..."
if pnpm lint 2>/dev/null; then
    pass "ESLint passed"
else
    warn "ESLint issues found (non-blocking)"
fi

# Check 5: Unit tests
echo ""
echo "🧪 Running unit tests..."
if pnpm test:unit:run 2>/dev/null | grep -q "passing"; then
    pass "Unit tests passing"
else
    fail "Unit tests failed"
fi

# Check 6: Database connection
echo ""
echo "🐘 Checking database..."
if docker compose ps | grep -q "postgres"; then
    pass "PostgreSQL container running"
    
    # Check if we can connect
    if pnpm prisma db execute --stdin <<<'SELECT 1' >/dev/null 2>&1; then
        pass "Database connection successful"
    else
        fail "Cannot connect to database"
    fi
else
    fail "PostgreSQL not running - run 'docker compose up -d'"
fi

# Check 7: Prisma schema
echo ""
echo "📊 Checking Prisma..."
if [ -f "prisma/schema.prisma" ]; then
    pass "Prisma schema exists"
    
    if pnpm prisma generate >/dev/null 2>&1; then
        pass "Prisma client generated"
    else
        fail "Prisma generate failed"
    fi
else
    fail "Prisma schema missing"
fi

# Check 8: Build
echo ""
echo "🏗️  Checking build..."
if [ -d ".next" ]; then
    pass "Next.js build exists"
else
    warn "No build found - run 'pnpm build' for production"
fi

# Check 9: Key files exist
echo ""
echo "📁 Checking key files..."
KEY_FILES=(
    "src/app/(dashboard)/[orgSlug]/page.tsx"
    "src/components/kanban/kanban-board.tsx"
    "src/components/agents/agent-list.tsx"
    "src/lib/realtime/use-realtime-tasks.ts"
)

for file in "${KEY_FILES[@]}"; do
    if [ -f "$file" ]; then
        pass "File exists: $file"
    else
        fail "File missing: $file"
    fi
done

# Summary
echo ""
echo "======================================"
echo "📊 VERIFICATION SUMMARY"
echo "======================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✨ All checks passed!${NC}"
    echo ""
    echo "🚀 Ready to start development:"
    echo "   pnpm dev"
    echo ""
    echo "🧪 Or run full test suite:"
    echo "   pnpm test:unit:run"
    echo "   pnpm test:e2e"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please fix the issues above.${NC}"
    echo ""
    echo "💡 Common fixes:"
    echo "   pnpm install"
    echo "   docker compose up -d"
    echo "   pnpm db:migrate"
    exit 1
fi