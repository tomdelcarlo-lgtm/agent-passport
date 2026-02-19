import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateApiKey, getKeyPrefix, hashApiKey } from "@/lib/api-keys";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agents = await prisma.agent.findMany({
    where: { userId: session.userId },
    select: {
      id: true, name: true, description: true, keyPrefix: true,
      active: true, createdAt: true, updatedAt: true,
      _count: { select: { permissions: true, verifyLogs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(agents);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, description } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const rawKey = generateApiKey();
    const keyPrefix = getKeyPrefix(rawKey);
    const apiKeyHash = await hashApiKey(rawKey);

    const agent = await prisma.agent.create({
      data: {
        name,
        description: description || "",
        apiKeyHash,
        keyPrefix,
        userId: session.userId,
      },
    });

    // Return the raw key ONLY on creation - it won't be retrievable again
    const { apiKeyHash: _, ...safeAgent } = agent;
    return NextResponse.json({ ...safeAgent, apiKey: rawKey });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
