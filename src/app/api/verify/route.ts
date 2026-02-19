import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/api-keys";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60; // requests per window
const RATE_WINDOW = 60_000; // 1 minute

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

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const scope = searchParams.get("scope");
  const service = searchParams.get("service") || "";

  if (!key || !scope) {
    return NextResponse.json({ error: "key and scope parameters are required" }, { status: 400 });
  }

  // Extract prefix for fast lookup
  const keyPrefix = key.substring(0, 11); // "ap_" + 8 chars

  // Find agents matching the prefix
  const candidates = await prisma.agent.findMany({
    where: { keyPrefix },
    include: { user: { select: { id: true } } },
  });

  let matchedAgent = null;
  for (const agent of candidates) {
    if (await verifyApiKey(key, agent.apiKeyHash)) {
      matchedAgent = agent;
      break;
    }
  }

  if (!matchedAgent) {
    return NextResponse.json({
      valid: false,
      status: "invalid_key",
      message: "Invalid API key",
    });
  }

  if (!matchedAgent.active) {
    await prisma.verifyLog.create({
      data: { agentId: matchedAgent.id, scope, service, status: "agent_inactive", ip },
    });
    return NextResponse.json({
      valid: false,
      status: "agent_inactive",
      agent: matchedAgent.name,
      message: "Agent is currently inactive",
    });
  }

  // Check if permission exists
  const permission = await prisma.permission.findUnique({
    where: { agentId_scope: { agentId: matchedAgent.id, scope } },
  });

  if (permission) {
    const status = permission.granted ? "allowed" : "denied";
    await prisma.verifyLog.create({
      data: { agentId: matchedAgent.id, scope, service, status, ip },
    });
    return NextResponse.json({
      valid: true,
      status,
      agent: matchedAgent.name,
      scope,
    });
  }

  // No permission exists - create notification for user to approve
  // Use upsert to avoid duplicate pending notifications
  await prisma.notification.upsert({
    where: {
      agentId_scope_status: { agentId: matchedAgent.id, scope, status: "pending" },
    },
    update: {},
    create: {
      agentId: matchedAgent.id,
      userId: matchedAgent.user.id,
      scope,
      service,
      status: "pending",
    },
  });

  await prisma.verifyLog.create({
    data: { agentId: matchedAgent.id, scope, service, status: "pending_approval", ip },
  });

  return NextResponse.json({
    valid: true,
    status: "pending_approval",
    agent: matchedAgent.name,
    scope,
    message: "Permission requested. Awaiting user approval.",
  });
}
