/**
 * PATCH /api/notifications/[id]
 *
 * Update a notification's status to "approved" or "denied".
 *
 * For "approve": the on-chain grantPermission() tx was already sent by the client
 *   (wagmi writeContract). This endpoint just marks the DB record as approved.
 * For "deny": no on-chain tx needed. Just mark as denied in DB.
 *   The /api/verify endpoint will return "denied" for future calls with this scope.
 *
 * Body: { action: "approve" | "deny", walletAddress: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { action, walletAddress } = await req.json();

  if (action !== "approve" && action !== "deny") {
    return NextResponse.json({ error: "action must be 'approve' or 'deny'" }, { status: 400 });
  }

  if (!walletAddress) {
    return NextResponse.json({ error: "walletAddress is required" }, { status: 400 });
  }

  const notification = await prisma.notification.findFirst({
    where: { id, walletAddress: walletAddress.toLowerCase(), status: "pending" },
  });

  if (!notification) {
    return NextResponse.json(
      { error: "Notification not found or already resolved" },
      { status: 404 },
    );
  }

  await prisma.notification.update({
    where: { id },
    data: { status: action === "approve" ? "approved" : "denied" },
  });

  return NextResponse.json({ ok: true, action, scope: notification.scope });
}
