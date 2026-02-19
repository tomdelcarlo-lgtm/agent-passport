import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const agent = await prisma.agent.findFirst({
    where: { id, userId: session.userId },
    include: {
      permissions: { orderBy: { createdAt: "desc" } },
      verifyLogs: { orderBy: { createdAt: "desc" }, take: 50 },
      _count: { select: { permissions: true, verifyLogs: true } },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const { apiKeyHash: _, ...safeAgent } = agent;
  return NextResponse.json(safeAgent);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const agent = await prisma.agent.findFirst({ where: { id, userId: session.userId } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.active !== undefined) data.active = body.active;

  const updated = await prisma.agent.update({ where: { id }, data });
  const { apiKeyHash: _h, ...safeUpdated } = updated;
  return NextResponse.json(safeUpdated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const agent = await prisma.agent.findFirst({ where: { id, userId: session.userId } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  await prisma.agent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
