/**
 * GET /api/notifications?wallet=0x...
 *
 * Returns all notifications for agents owned by the given wallet address.
 * Auth: wallet address passed as query param (ownership verified against DB data).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();

  if (!wallet) {
    return NextResponse.json({ error: "wallet parameter is required" }, { status: 400 });
  }

  const notifications = await prisma.notification.findMany({
    where: { walletAddress: wallet },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notifications);
}
