#!/usr/bin/env bash
# WMSCPP E2E Test Script (Linux / macOS / WSL)
# Usage:
#   ./scripts/run-e2e.sh              # รัน E2E ปกติ
#   ./scripts/run-e2e.sh --low-memory  # ใช้ production build (กิน RAM น้อย)
#   ./scripts/run-e2e.sh --existing-server  # ไม่สตาร์ท server (รัน npm run dev ไว้ก่อน)
#   ./scripts/run-e2e.sh --unit-first # รัน unit test ก่อน แล้วค่อย E2E

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:3006}"

LOW_MEMORY=0
EXISTING_SERVER=0
UNIT_FIRST=0

for arg in "$@"; do
  case "$arg" in
    --low-memory)        LOW_MEMORY=1 ;;
    --existing-server)   EXISTING_SERVER=1 ;;
    --unit-first)        UNIT_FIRST=1 ;;
    -h|--help)
      echo "Usage: $0 [--low-memory] [--existing-server] [--unit-first]"
      echo "  --low-memory        Use production build (less RAM)"
      echo "  --existing-server   Do not start server (must run npm run dev first)"
      echo "  --unit-first        Run unit tests before E2E"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

cd "$ROOT_DIR"

echo "WMSCPP E2E Test Script"
echo ""

if [ "$UNIT_FIRST" -eq 1 ]; then
  echo "Running unit tests first..."
  npm run test:unit:run
  echo "Unit tests passed."
  echo ""
fi

if [ "$EXISTING_SERVER" -eq 1 ]; then
  echo "Checking for existing server at $BASE_URL..."
  if curl -sf --connect-timeout 3 "$BASE_URL" > /dev/null 2>&1; then
    echo "Server is running."
  else
    echo "No server at $BASE_URL. Start the app first: npm run dev"
    echo "Then run: $0 --existing-server"
    exit 1
  fi
  export E2E_USE_PRODUCTION=0
  echo "Running E2E tests (reusing existing server)..."
else
  if [ "$LOW_MEMORY" -eq 1 ]; then
    export E2E_USE_PRODUCTION=1
    echo "Running E2E with production server (low memory mode)..."
  else
    export E2E_USE_PRODUCTION=0
    echo "Running E2E with dev server..."
  fi
  echo "Running Playwright..."
fi

npx playwright test
exit $?
