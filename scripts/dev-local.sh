#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# dev-local.sh — One-command local blockchain dev environment
#
# What it does:
#   1. Starts a Hardhat node on localhost:8545 (persists between restarts)
#   2. Deploys AgentPassport only when starting a fresh chain
#   3. Starts the Next.js dev server
#
# The Hardhat node is detached from the shell's process group so it keeps
# running after Ctrl+C (and between npm run dev:local restarts).
# This means agents, permissions, and the SQLite DB all survive restarts.
#
# To stop the Hardhat node:  npm run hardhat:stop
# Usage:                     npm run dev:local
# ─────────────────────────────────────────────────────────────────────────────

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BLOCKCHAIN_DIR="$ROOT_DIR/blockchain"

# ─── Cleanup (Next.js only — Hardhat persists intentionally) ──────────────────
cleanup() {
  echo ""
  echo "  Next.js stopped."
  echo "  Hardhat node is still running on :8545 (blockchain state preserved)."
  echo "  Stop it with: npm run hardhat:stop"
  echo ""
}
trap cleanup EXIT INT TERM

# ─── 1. Start Hardhat node (skip if already running) ─────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Agent Passport — Local Dev"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FRESH_NODE=false

if lsof -ti tcp:8545 >/dev/null 2>&1; then
  EXISTING_PID=$(lsof -ti tcp:8545 | head -1)
  echo "[1/3] Hardhat node already running on :8545 (pid $EXISTING_PID) — reusing"
else
  echo "[1/3] Starting Hardhat node on localhost:8545…"
  echo "      (detached — survives Ctrl+C; stop with: npm run hardhat:stop)"

  cd "$BLOCKCHAIN_DIR"
  npx hardhat node --port 8545 > /tmp/hardhat-node.log 2>&1 &
  HARDHAT_PID=$!
  # Detach from this shell's process group so Ctrl+C doesn't kill it
  disown "$HARDHAT_PID"

  echo "      Waiting for node to be ready…"
  for i in $(seq 1 30); do
    if curl -s -o /dev/null -w "%{http_code}" \
        -X POST http://127.0.0.1:8545 \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' 2>/dev/null \
        | grep -q "200"; then
      echo "      ✓ Node ready (pid $HARDHAT_PID)"
      break
    fi

    if [ $i -eq 30 ]; then
      echo ""
      echo "ERROR: Hardhat node failed to start after 30s."
      echo "Last log:"
      tail -20 /tmp/hardhat-node.log
      exit 1
    fi

    if ! kill -0 "$HARDHAT_PID" 2>/dev/null; then
      echo ""
      echo "ERROR: Hardhat node process exited unexpectedly."
      cat /tmp/hardhat-node.log
      exit 1
    fi

    sleep 1
  done

  FRESH_NODE=true
fi

# ─── 2. Deploy AgentPassport (only on fresh chain) ────────────────────────────
echo ""
if [ "$FRESH_NODE" = "true" ]; then
  echo "[2/3] Deploying AgentPassport to localhost…"
  cd "$BLOCKCHAIN_DIR"
  npx hardhat run scripts/deploy-local.ts --network localhost
else
  echo "[2/3] Skipping deploy — contract already on running chain"
  if grep -q "NEXT_PUBLIC_CONTRACT_ADDRESS" "$ROOT_DIR/.env.local" 2>/dev/null; then
    CONTRACT_ADDR=$(grep "NEXT_PUBLIC_CONTRACT_ADDRESS" "$ROOT_DIR/.env.local" | cut -d= -f2)
    echo "      Contract: $CONTRACT_ADDR"
  fi
fi

# ─── 3. Start Next.js ─────────────────────────────────────────────────────────
echo ""
echo "[3/3] Starting Next.js dev server…"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MetaMask setup (first time):"
echo "    Network:  Localhost 8545 (chainId 31337)"
echo "    RPC URL:  http://127.0.0.1:8545"
echo "    Import a test account private key from the Hardhat node output"
echo "    (see /tmp/hardhat-node.log for the list of accounts)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$ROOT_DIR"
# exec replaces the shell with next dev; cleanup trap fires on exit
exec npm run dev
