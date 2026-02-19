import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateApiKey, getKeyPrefix, hashApiKey } from "@/lib/api-keys";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const agent = await prisma.agent.findFirst({ where: { id, userId: session.userId } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const rawKey = generateApiKey();
  const keyPrefix = getKeyPrefix(rawKey);
  const apiKeyHash = await hashApiKey(rawKey);

  await prisma.agent.update({
    where: { id },
    data: { apiKeyHash, keyPrefix },
  });

  return NextResponse.json({ apiKey: rawKey });
}
