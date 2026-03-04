# Agent Passport

**Blockchain-based identity and permission management for AI agents.**

Agent Passport lets you register AI agents on-chain, grant them granular scopes, and let any web service verify those permissions trustlessly — without relying on a central authority.

---

## Why Blockchain?

AI agents act on your behalf. They read your email, write to your calendar, post to your socials. The question is: who decides what they're allowed to do, and can that decision be trusted?

A traditional database is controlled by whoever owns the server. Permissions can be silently changed, retroactively altered, or deleted without trace. You have to trust the platform — and so does every service that interacts with your agent.

A blockchain is different:

- **Immutable.** Once a permission is granted or revoked, that transaction is permanent and publicly verifiable. No one — not even the creator of this system — can alter it without leaving a record.
- **Trustless.** Any service can verify an agent's permissions by reading directly from the contract. No API call to a central server, no token to validate against a proprietary database.
- **Auditable.** The full history of every permission change is on-chain forever. You can always prove what an agent was or wasn't allowed to do at any point in time.
- **Censorship-resistant.** Permissions you grant live on a public blockchain. They can't be suspended, throttled, or revoked by a platform policy change.

This is the right foundation for agent identity at scale.

---

## The Passport Concept

Think of it like a passport system for the digital world.

**You are the government.** When you register an agent, you issue it a passport — a unique, on-chain identity tied to your wallet. You define what it's allowed to do. You can grant permissions, revoke them, or invalidate the passport entirely.

**Your agents are the citizens.** Each agent carries its passport (an API key linked to an on-chain identity) and presents it when accessing services.

**Web services are the border checkpoints.** When a service receives a request from an agent, it calls `/api/verify` with the agent's key and the required scope. The system checks the blockchain and returns `allowed`, `denied`, or `pending_approval`.

**The key properties:**
- No service needs to trust Agent Passport. They verify directly against the contract.
- No permission can be forged. The smart contract enforces ownership — only your wallet can grant or revoke permissions for your agents.
- You are sovereign. You control everything. You can deactivate an agent at any moment, instantly invalidating all its access across every service.

This is digital sovereignty over your own AI agents.

---

## Features

- **Blockchain-based identity** — Every agent is registered on-chain with a unique ID, owner address, and lifecycle state.
- **Granular permission scopes** — String-based scopes (`email:read`, `calendar:write`, `files:delete`) give precise control over what each agent can access.
- **Trustless verification** — Services verify permissions by reading directly from the smart contract. No central trust required.
- **Approval flow for unknown scopes** — If an agent requests a scope that hasn't been granted yet, the system creates a pending notification. You review and approve (or deny) from your dashboard. The approval triggers an on-chain transaction.
- **Immutable audit trail** — Every verification attempt is logged with timestamp, IP, service name, and result.
- **API key rotation** — Regenerate an agent's API key at any time without affecting on-chain permissions.
- **Wallet-based auth** — No username/password. Connect with MetaMask or any EVM wallet via RainbowKit.

---

## Installation

### Prerequisites

- Node.js 18+
- A wallet with test ETH (for local dev, Hardhat provides pre-funded accounts)
- (Optional) WalletConnect project ID from [cloud.walletconnect.com](https://cloud.walletconnect.com)

### Setup

```bash
# Clone the repo
git clone https://github.com/tomdelcarlo-lgtm/agent-passport.git
cd agent-passport

# Install dependencies
npm install

# Install blockchain dependencies
cd blockchain && npm install && cd ..

# Copy environment file
cp .env.local.example .env.local
```

### Running Locally

The `dev:local` script handles everything in one command: it starts a local Hardhat blockchain, deploys the contract, and launches the Next.js dev server.

```bash
npm run dev:local
```

This will:
1. Start a Hardhat node on `http://127.0.0.1:8545` (if not already running)
2. Deploy `AgentPassport.sol` and write the contract address to `.env.local` automatically
3. Run database migrations via Prisma
4. Start the Next.js dev server at `http://localhost:3000`

To stop the Hardhat node when you're done:

```bash
npm run hardhat:stop
```

### Running Tests

```bash
# Smart contract tests
npm run test:contracts

# Compile contracts
npm run compile
```

---

## How It Works

### 1. Create an Agent

1. Go to `/dashboard/agents/new` and connect your wallet.
2. Fill in the agent name and description.
3. Sign the `createAgent` transaction — this registers your agent on-chain and assigns it a unique ID.
4. The dashboard generates an API key (`ap_...`) for that agent. **Save it — it's shown only once.**

### 2. Grant Permissions

From the agent detail page, grant scopes like `email:read` or `calendar:write`. Each grant is an on-chain transaction signed by your wallet. The contract enforces that only the agent's owner can modify its permissions.

### 3. Verify from a Service

Any service can verify an agent's permissions with a single HTTP call:

```bash
curl "https://your-domain.com/api/verify?key=ap_YOUR_KEY&scope=email:read&service=myapp"
```

The API checks the blockchain and returns a result immediately.

### 4. Approval Flow for Unknown Scopes

If a service requests a scope that hasn't been granted yet, the agent receives a `pending_approval` response and a notification appears in your dashboard. You can review and approve or deny it. Approving triggers an on-chain `grantPermission` transaction from your wallet.

---

## API Reference

### `GET /api/verify`

Verifies whether an agent has permission for a given scope.

**Query parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `key` | Yes | The agent's API key (`ap_...`) |
| `scope` | Yes | The permission scope to check (e.g. `email:read`) |
| `service` | No | Name of the calling service (for audit logs) |

**Responses:**

```json
// Allowed
{ "valid": true, "status": "allowed", "agent": "Email Bot", "scope": "email:read" }

// Denied (scope exists on-chain but was revoked)
{ "valid": false, "status": "denied", "agent": "Email Bot", "scope": "email:read" }

// Pending approval (scope not yet on-chain — notification sent to owner)
{ "valid": true, "status": "pending_approval", "agent": "Email Bot", "message": "Permission requested. Awaiting owner approval." }

// Invalid API key
{ "valid": false, "status": "invalid_key", "message": "Invalid API key" }

// Agent deactivated by owner
{ "valid": false, "status": "agent_inactive", "agent": "Email Bot", "message": "Agent is currently inactive" }
```

**Rate limit:** 60 requests per minute per IP.

---

## Architecture

Agent Passport has three layers:

```
┌─────────────────────────────────────────────────────────────┐
│                     BLOCKCHAIN LAYER                        │
│                                                             │
│   AgentPassport.sol (Solidity 0.8.28)                       │
│   • createAgent / deactivateAgent                           │
│   • grantPermission / revokePermission                      │
│   • verifyPermission (view — free to call)                  │
│   • On-chain ownership via wallet address                   │
│                                                             │
│   Deployed on: Hardhat localhost (dev) / Base Sepolia       │
└───────────────────────┬─────────────────────────────────────┘
                        │ viem / wagmi
┌───────────────────────▼─────────────────────────────────────┐
│                     BACKEND LAYER                           │
│                                                             │
│   Next.js API Routes                                        │
│   • /api/verify        — permission check + audit log      │
│   • /api/agents/*      — key management                    │
│   • /api/notifications — approval workflow                 │
│                                                             │
│   SQLite via Prisma                                         │
│   • AgentKey — hashed API keys (secrets never on-chain)    │
│   • VerifyLog — immutable audit trail                       │
│   • Notification — pending approval queue                  │
└───────────────────────┬─────────────────────────────────────┘
                        │ React Server / Client Components
┌───────────────────────▼─────────────────────────────────────┐
│                     FRONTEND LAYER                          │
│                                                             │
│   Next.js 15 + React + Tailwind CSS                         │
│   RainbowKit — wallet connection UI                         │
│   wagmi + viem — contract reads and writes                  │
│                                                             │
│   Pages:                                                    │
│   • /dashboard              — agent list                   │
│   • /dashboard/agents/new   — create agent (on-chain tx)   │
│   • /dashboard/agents/[id]  — permissions + audit logs     │
│   • /dashboard/notifications — approval queue              │
└─────────────────────────────────────────────────────────────┘
```

**Design decisions:**
- **On-chain:** agent identity, permission grants/revocations, ownership. These are the trust-critical facts.
- **Off-chain (SQLite):** API key hashes, verification logs, approval queue. These are operational details that don't need blockchain guarantees.
- **Never on-chain:** raw API keys. Secrets stay off-chain, hashed with bcryptjs.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity 0.8.28, Hardhat |
| Blockchain | Base (local: Hardhat, testnet: Base Sepolia) |
| Frontend | Next.js 15, React, Tailwind CSS |
| Wallet | RainbowKit, wagmi, viem |
| Database | Prisma ORM, SQLite |
| API | Next.js API Routes (App Router) |
| Auth | Wallet signature verification (no passwords) |

---

## Deploying to Base Mainnet

The project is designed to move from local dev → Base Sepolia testnet → Base mainnet with minimal changes.

Three things to update in `src/lib/wagmi.ts`:

```ts
// Before (testnet)
import { baseSepolia } from "wagmi/chains";
chains: [baseSepolia],
transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL)

// After (mainnet)
import { base } from "wagmi/chains";
chains: [base],
transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL)
```

Then deploy the contract and update your environment:

```bash
npm run deploy:base-mainnet
# Update NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local with the new address
```

---

## License

MIT

## Build note

This project was built with **Claude Code**.
