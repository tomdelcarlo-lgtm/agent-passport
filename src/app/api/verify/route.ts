/**
 * GET /api/verify?key=ap_XXX&scope=email:read&service=myapp
 *
 * Verifies an AI agent's permission to perform a given scope.
 * Source of truth: AgentPassport smart contract (local hardhat node by default).
 * API key hash: off-chain SQLite (secrets can't go on-chain).
 *
 * Flow:
 *  1. Look up agentId via key prefix in DB + bcrypt verify
 *  2. Read agent.active from contract → if false: agent_inactive
 *  3. Read permission from contract → if granted: allowed; if denied: denied
 *  4. If permission not on-chain: check DB for denied notification
 *  5. If no pending/denied notification: create pending notification → pending_approval
 */
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { hardhat } from "viem/chains";
// import { base } from "viem/chains"; // ← uncomment for Base mainnet
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/api-keys";
import { AGENT_PASSPORT_ABI, AGENT_PASSPORT_ADDRESS } from "@/lib/contract";

// ─── Contract client ──────────────────────────────────────────────────────────

const publicClient = createPublicClient({
  chain: hardhat,
  transport: http(process.env.RPC_URL ?? "http://127.0.0.1:8545"),
  // For Base mainnet, set RPC_URL=https://mainnet.base.org (or your Alchemy/Infura URL)
  // and swap chain to base above.
});

// ─── Rate limiter ─────────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const scope = searchParams.get("scope");
  const service = searchParams.get("service") ?? "";

  if (!key || !scope) {
    return NextResponse.json(
      { error: "key and scope parameters are required" },
      { status: 400 },
    );
  }

  // 1. Find AgentKey by prefix, then verify hash
  const keyPrefix = key.substring(0, 11); // "ap_" + 8 chars

  const candidates = await prisma.agentKey.findMany({
    where: { keyPrefix },
  });

  let matchedKey: (typeof candidates)[0] | null = null;
  for (const candidate of candidates) {
    if (await verifyApiKey(key, candidate.apiKeyHash)) {
      matchedKey = candidate;
      break;
    }
  }

  if (!matchedKey) {
    return NextResponse.json({ valid: false, status: "invalid_key", message: "Invalid API key" });
  }

  const agentId = BigInt(matchedKey.agentId);

  // 2. Read agent from contract
  let agent: { name: string; active: boolean; owner: `0x${string}` };
  try {
    agent = await publicClient.readContract({
      address: AGENT_PASSPORT_ADDRESS,
      abi: AGENT_PASSPORT_ABI,
      functionName: "getAgent",
      args: [agentId],
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to read from contract. Check NEXT_PUBLIC_CONTRACT_ADDRESS." },
      { status: 503 },
    );
  }

  if (!agent.active) {
    await prisma.verifyLog.create({
      data: { agentId: matchedKey.agentId, scope, service, status: "agent_inactive", ip },
    });
    return NextResponse.json({
      valid: false,
      status: "agent_inactive",
      agent: agent.name,
      message: "Agent is currently inactive",
    });
  }

  // 3. Read permission from contract
  const permission = await publicClient.readContract({
    address: AGENT_PASSPORT_ADDRESS,
    abi: AGENT_PASSPORT_ABI,
    functionName: "getPermission",
    args: [agentId, scope],
  });

  if (permission.exists) {
    const status = permission.granted ? "allowed" : "denied";
    await prisma.verifyLog.create({
      data: { agentId: matchedKey.agentId, scope, service, status, ip },
    });
    return NextResponse.json({
      valid: permission.granted,
      status,
      agent: agent.name,
      scope,
    });
  }

  // 4. Permission not on-chain — check DB for an off-chain denial
  const dbNotification = await prisma.notification.findFirst({
    where: {
      agentId: matchedKey.agentId,
      scope,
      status: { in: ["denied", "pending"] },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (dbNotification?.status === "denied") {
    await prisma.verifyLog.create({
      data: { agentId: matchedKey.agentId, scope, service, status: "denied", ip },
    });
    return NextResponse.json({
      valid: false,
      status: "denied",
      agent: agent.name,
      scope,
    });
  }

  if (dbNotification?.status === "pending") {
    await prisma.verifyLog.create({
      data: { agentId: matchedKey.agentId, scope, service, status: "pending_approval", ip },
    });
    return NextResponse.json({
      valid: true,
      status: "pending_approval",
      agent: agent.name,
      scope,
      message: "Permission requested. Awaiting user approval.",
    });
  }

  // 5. No notification exists — create one
  await prisma.notification.upsert({
    where: {
      agentId_scope_status: { agentId: matchedKey.agentId, scope, status: "pending" },
    },
    update: {},
    create: {
      agentId: matchedKey.agentId,
      walletAddress: agent.owner.toLowerCase(),
      scope,
      service,
      status: "pending",
    },
  });

  await prisma.verifyLog.create({
    data: { agentId: matchedKey.agentId, scope, service, status: "pending_approval", ip },
  });

  return NextResponse.json({
    valid: true,
    status: "pending_approval",
    agent: agent.name,
    scope,
    message: "Permission requested. Awaiting user approval.",
  });
}
