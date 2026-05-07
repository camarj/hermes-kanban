#!/bin/bash
set -euo pipefail

echo "=== Stopping all services ==="
docker compose down

echo ""
echo "=== Services stopped ==="
echo "  To start again: ./scripts/docker-dev.sh"
echo "  To reset Hermes data: docker compose down -v"
echo "  To reset everything:  docker compose down -v && npx prisma migrate reset"