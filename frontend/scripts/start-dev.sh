#!/bin/bash
set -e

echo "Cleaning up old processes..."
PIDS=$(lsof -ti tcp:3000 -sTCP:LISTEN 2>/dev/null || true)
if [ -n "$PIDS" ]; then
  echo "Killing port 3000 listeners: $PIDS"
  kill -9 $PIDS 2>/dev/null || true
fi

echo "Clearing Next.js cache..."
rm -rf .next

echo "Starting dev server on port 3000..."
npm run dev
