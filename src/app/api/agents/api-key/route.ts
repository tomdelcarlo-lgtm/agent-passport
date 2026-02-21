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
import { hardhat } from "viem/chains";
// import { base } from "viem/chains"; // ← uncomment for Base mainnet
import { prisma } from "@/lib/prisma";
import { generateApiKey, getKeyPrefix, hashApiKey } from "@/lib/api-keys";
import { AGENT_PASSPORT_ABI, AGENT_PASSPORT_ADDRESS } from "@/lib/contract";

const publicClient = createPublicClient({
  chain: hardhat,
  // chain: base, // ← uncomment for Base mainnet
  transport: http(process.env.RPC_URL ?? "http://127.0.0.1:8545"),
  // For Base mainnet set RPC_URL=https://mainnet.base.org (or Alchemy/Infura URL)
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
