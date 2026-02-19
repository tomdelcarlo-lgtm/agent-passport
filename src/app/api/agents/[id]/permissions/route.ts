import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const agent = await prisma.agent.findFirst({ where: { id, userId: session.userId } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const permissions = await prisma.permission.findMany({
    where: { agentId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(permissions);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const agent = await prisma.agent.findFirst({ where: { id, userId: session.userId } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const { scope, service, granted } = await req.json();

  if (!scope) {
    return NextResponse.json({ error: "Scope is required" }, { status: 400 });
  }

  const permission = await prisma.permission.upsert({
    where: { agentId_scope: { agentId: id, scope } },
    update: { granted: granted ?? true, service: service || "" },
    create: { agentId: id, scope, service: service || "", granted: granted ?? true },
  });

  return NextResponse.json(permission);
}
