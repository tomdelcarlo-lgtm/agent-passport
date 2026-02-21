#!/usr/bin/env bash
# Stops the persistent Hardhat node started by npm run dev:local
PIDS=$(lsof -ti tcp:8545 2>/dev/null)
if [ -n "$PIDS" ]; then
  echo "$PIDS" | xargs kill 2>/dev/null || true
  echo "Hardhat node stopped (was pid $PIDS)"
else
  echo "No process running on :8545"
fi
