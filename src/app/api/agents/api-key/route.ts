/**
 * POST /api/agents/api-key
 *
 * Creates a new off-chain API key for an agent that was just registered on-chain.
 * Verifies on-chain that the requesting wallet owns the agent before creating the key.
 *
 * Body: { agentId: string, walletAddress: string }
 * Returns: { apiKey: string } — only returned once, never retrievable again
 */
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { prisma } from "@/lib/prisma";
import { generateApiKey, getKeyPrefix, hashApiKey } from "@/lib/api-keys";
import { AGENT_PASSPORT_ABI, AGENT_PASSPORT_ADDRESS } from "@/lib/contract";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org"),
});

export async function POST(req: NextRequest) {
  try {
    const { agentId, walletAddress } = await req.json();

    if (!agentId || !walletAddress) {
      return NextResponse.json({ error: "agentId and walletAddress are required" }, { status: 400 });
    }

    // Verify on-chain that the wallet owns this agent
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

    // Upsert: create or replace the key for this agentId
    await prisma.agentKey.upsert({
      where: { agentId },
      update: { apiKeyHash, keyPrefix },
      create: { agentId, apiKeyHash, keyPrefix },
    });

    return NextResponse.json({ apiKey: rawKey });
  } catch (err: unknown) {
    console.error("POST /api/agents/api-key:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
