/**
 * GET /api/agents/[id]/logs (via route.ts at [id])
 *
 * Returns: { keyPrefix, logs[] } for a given on-chain agentId.
 * No auth — agent data is public on-chain; logs are an off-chain audit trail.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;

  const agentKey = await prisma.agentKey.findUnique({
    where: { agentId },
    select: { keyPrefix: true },
  });

  const logs = await prisma.verifyLog.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    keyPrefix: agentKey?.keyPrefix ?? null,
    logs,
  });
}
