/**
 * POST /api/agents/[id]/regenerate-key
 *
 * Generates a new API key for an agent, verifying on-chain ownership first.
 * Body: { walletAddress: string }
 * Returns: { apiKey: string } — only shown once
 */
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { hardhat } from "viem/chains";
// import { base } from "viem/chains"; // ← uncomment for Base mainnet
import { prisma } from "@/lib/prisma";
import { generateApiKey, getKeyPrefix, hashApiKey } from "@/lib/api-keys";
import { AGENT_PASSPORT_ABI, AGENT_PASSPORT_ADDRESS } from "@/lib/contract";

const publicClient = createPublicClient({
  chain: hardhat,
  // chain: base, // ← uncomment for Base mainnet
  transport: http(process.env.RPC_URL ?? "http://127.0.0.1:8545"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;

  try {
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress is required" }, { status: 400 });
    }

    // Verify on-chain ownership
    const agent = await publicClient.readContract({
      address: AGENT_PASSPORT_ADDRESS,
      abi: AGENT_PASSPORT_ABI,
      functionName: "getAgent",
      args: [BigInt(agentId)],
    });

    if (agent.owner.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ error: "Wallet does not own this agent" }, { status: 403 });
    }

    const rawKey = generateApiKey();
    const keyPrefix = getKeyPrefix(rawKey);
    const apiKeyHash = await hashApiKey(rawKey);

    await prisma.agentKey.upsert({
      where: { agentId },
      update: { apiKeyHash, keyPrefix },
      create: { agentId, apiKeyHash, keyPrefix },
    });

    return NextResponse.json({ apiKey: rawKey });
  } catch (err: unknown) {
    console.error("POST /api/agents/[id]/regenerate-key:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
