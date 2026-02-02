#!/usr/bin/env bash
# WMSCPP - Kill all test-related processes to free RAM (Linux / macOS / WSL)
# Usage:
#   ./scripts/kill-test-processes.sh              # Kill server on 3006 + Node (vitest/playwright/next)
#   ./scripts/kill-test-processes.sh --dry-run    # แสดง process ที่จะ kill โดยไม่ kill
#   ./scripts/kill-test-processes.sh --include-browser  # รวม Chromium ที่ Playwright อาจเหลือไว้

set -e

APP_PORT="${APP_PORT:-3006}"
DRY_RUN=0
INCLUDE_BROWSER=0

for arg in "$@"; do
  case "$arg" in
    --dry-run)        DRY_RUN=1 ;;
    --include-browser) INCLUDE_BROWSER=1 ;;
    -h|--help)
      echo "Usage: $0 [--dry-run] [--include-browser]"
      echo "  --dry-run         Show what would be killed, do not kill"
      echo "  --include-browser Kill Chromium/Chrome likely from Playwright"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

echo "WMSCPP - Kill test-related processes (port $APP_PORT, vitest, playwright, next)"
[ "$DRY_RUN" -eq 1 ] && echo "Dry run - no process will be killed."
echo ""

KILLED=0

# 1. Kill processes using port 3006
if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti ":$APP_PORT" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    for pid in $PIDS; do
      name=$(ps -p "$pid" -o comm= 2>/dev/null || echo "PID $pid")
      if [ "$DRY_RUN" -eq 1 ]; then
        echo "[DryRun] Would kill $name (PID $pid) - using port $APP_PORT"
      else
        kill -9 "$pid" 2>/dev/null && { echo "Killed $name (PID $pid) - port $APP_PORT"; KILLED=$((KILLED+1)); } || true
      fi
    done
  fi
elif command -v fuser >/dev/null 2>&1; then
  if [ "$DRY_RUN" -eq 1 ]; then
    fuser -k "$APP_PORT/tcp" 2>/dev/null && echo "[DryRun] Would kill process on port $APP_PORT" || true
  else
    fuser -k "$APP_PORT/tcp" 2>/dev/null && { echo "Killed process on port $APP_PORT"; KILLED=$((KILLED+1)); } || true
  fi
else
  echo "lsof/fuser not found - skipping port $APP_PORT"
fi

# 2. Kill Node processes: vitest, playwright, next dev, next start, standalone server
if command -v pgrep >/dev/null 2>&1; then
  for pattern in "vitest" "playwright" "next dev" "next start" "standalone/server"; do
    # pgrep -f matches full command line; avoid killing this script's parent shell
    PIDS=$(pgrep -f "node.*$pattern" 2>/dev/null || true)
    for pid in $PIDS; do
      [ "$pid" -eq $$ ] && continue
      cmd=$(ps -p "$pid" -o args= 2>/dev/null | head -c 80)
      if [ "$DRY_RUN" -eq 1 ]; then
        echo "[DryRun] Would kill node (PID $pid) - $cmd..."
      else
        kill -9 "$pid" 2>/dev/null && { echo "Killed node (PID $pid)"; KILLED=$((KILLED+1)); } || true
      fi
    done
  done
fi

# 3. Optional: Kill Chromium/Chrome with Playwright args
if [ "$INCLUDE_BROWSER" -eq 1 ]; then
  for name in chromium chrome chromedriver; do
    PIDS=$(pgrep -f "$name.*--disable-dev-shm-usage\|$name.*--no-sandbox" 2>/dev/null || true)
    for pid in $PIDS; do
      if [ "$DRY_RUN" -eq 1 ]; then
        echo "[DryRun] Would kill $name (PID $pid) - likely Playwright browser"
      else
        kill -9 "$pid" 2>/dev/null && { echo "Killed $name (PID $pid)"; KILLED=$((KILLED+1)); } || true
      fi
    done
  done
fi

echo ""
if [ "$DRY_RUN" -eq 1 ]; then
  echo "Dry run complete. Run without --dry-run to actually kill processes."
else
  echo "Done. Stopped $KILLED process(es)."
fi
