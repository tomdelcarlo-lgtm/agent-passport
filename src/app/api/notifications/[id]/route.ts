import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const notification = await prisma.notification.findFirst({
    where: { id, userId: session.userId, status: "pending" },
  });

  if (!notification) {
    return NextResponse.json({ error: "Notification not found or already resolved" }, { status: 404 });
  }

  const { action } = await req.json(); // "approve" or "deny"

  if (action !== "approve" && action !== "deny") {
    return NextResponse.json({ error: "Action must be 'approve' or 'deny'" }, { status: 400 });
  }

  const granted = action === "approve";

  // Update notification status
  await prisma.notification.update({
    where: { id },
    data: { status: granted ? "approved" : "denied" },
  });

  // Create or update the permission
  await prisma.permission.upsert({
    where: {
      agentId_scope: { agentId: notification.agentId, scope: notification.scope },
    },
    update: { granted, service: notification.service },
    create: {
      agentId: notification.agentId,
      scope: notification.scope,
      service: notification.service,
      granted,
    },
  });

  return NextResponse.json({ ok: true, action, scope: notification.scope });
}
