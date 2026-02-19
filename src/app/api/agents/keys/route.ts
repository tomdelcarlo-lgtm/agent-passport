/**
 * GET /api/agents/keys?agentIds=1,2,3
 *
 * Returns API key prefixes for the given on-chain agent IDs.
 * Used by the dashboard to display key prefixes without revealing the full key.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("agentIds") ?? "";
  const agentIds = raw.split(",").map((s) => s.trim()).filter(Boolean);

  if (agentIds.length === 0) {
    return NextResponse.json([]);
  }

  const keys = await prisma.agentKey.findMany({
    where: { agentId: { in: agentIds } },
    select: { agentId: true, keyPrefix: true },
  });

  return NextResponse.json(keys);
}
