#!/bin/bash
set -euo pipefail

echo "=== Hermes Kanban - Development Setup ==="
echo ""

# Check Docker
if ! command -v docker &>/dev/null; then
    echo "ERROR: Docker is not installed. Install it first: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker compose version &>/dev/null; then
    echo "ERROR: Docker Compose is not available."
    exit 1
fi

echo "[1/5] Checking .env file..."
if [ ! -f .env ]; then
    echo "  Creating .env from .env.example..."
    cp .env.example .env
    echo "  IMPORTANT: Edit .env with your API keys before continuing."
    echo "  Required: OPENROUTER_API_KEY or ANTHROPIC_API_KEY"
    echo ""
    echo "  Run: nano .env"
    echo "  Then: ./scripts/docker-dev.sh"
    exit 0
fi

echo "[2/5] Starting PostgreSQL..."
docker compose up -d postgres
echo "  Waiting for PostgreSQL to be ready..."
sleep 3

echo "[3/5] Running database migrations..."
npx prisma migrate dev --name init 2>/dev/null || npx prisma migrate deploy 2>/dev/null || true
npx prisma generate

echo "[4/5] Starting Hermes Gateway..."
docker compose up -d hermes
echo "  Waiting for Hermes Gateway to be ready..."
max_retries=30
retry=0
while [ $retry -lt $max_retries ]; do
    if curl -sf http://127.0.0.1:8642/health &>/dev/null; then
        echo "  Hermes Gateway is ready!"
        break
    fi
    retry=$((retry + 1))
    echo "  Waiting... ($retry/$max_retries)"
    sleep 2
done

if [ $retry -eq $max_retries ]; then
    echo "  WARNING: Hermes Gateway did not start in time."
    echo "  Check logs: docker compose logs hermes"
    echo "  You can still run the Next.js app without Hermes."
    echo "  Some features (chat, agent profiles) will not work."
fi

echo "[5/5] Starting Next.js development server..."
echo ""
echo "=== Services ==="
echo "  Next.js App:  http://localhost:3000"
echo "  PostgreSQL:   localhost:5435"
echo "  Hermes API:   http://localhost:8642"
echo "  Hermes Health: http://localhost:8642/health"
echo "  Hermes Models: http://localhost:8642/v1/models"
echo ""
echo "=== Useful Commands ==="
echo "  Stop all:     docker compose down"
echo "  Hermes logs:  docker compose logs -f hermes"
echo "  DB logs:      docker compose logs -f postgres"
echo "  Reset Hermes:  docker compose down -v && docker compose up -d hermes"
echo "  Prisma Studio: npx prisma studio"
echo ""

npm run dev