"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AGENT_PASSPORT_ABI, AGENT_PASSPORT_ADDRESS } from "@/lib/contract";

interface AgentOnChain {
  name: string;
  description: string;
  active: boolean;
  owner: `0x${string}`;
  createdAt: bigint;
}

interface AgentKeyInfo {
  agentId: string;
  keyPrefix: string;
}

export default function DashboardPage() {
  const { address } = useAccount();
  const [keyMap, setKeyMap] = useState<Record<string, string>>({});

  // 1. Get all agentIds for this wallet from the contract
  const { data: agentIds, isLoading: idsLoading } = useReadContract({
    address: AGENT_PASSPORT_ADDRESS,
    abi: AGENT_PASSPORT_ABI,
    functionName: "getAgentsByOwner",
    args: [address!],
    query: { enabled: !!address },
  });

  // 2. Batch-read each agent's data
  const agentCalls = (agentIds ?? []).map((id) => ({
    address: AGENT_PASSPORT_ADDRESS,
    abi: AGENT_PASSPORT_ABI,
    functionName: "getAgent" as const,
    args: [id] as [bigint],
  }));

  const { data: agentsData, isLoading: agentsLoading } = useReadContracts({
    contracts: agentCalls,
    query: { enabled: agentCalls.length > 0 },
  });

  // 3. Fetch API key prefixes from DB for display
  useEffect(() => {
    if (!agentIds || agentIds.length === 0) return;
    const ids = agentIds.map((id) => id.toString()).join(",");
    fetch(`/api/agents/keys?agentIds=${ids}`)
      .then((r) => r.json())
      .then((data: AgentKeyInfo[]) => {
        const map: Record<string, string> = {};
        data.forEach((k) => (map[k.agentId] = k.keyPrefix));
        setKeyMap(map);
      })
      .catch(() => {});
  }, [agentIds]);

  const loading = idsLoading || agentsLoading;

  if (loading) {
    return <div className="flex justify-center py-20 text-muted-foreground">Loading agents…</div>;
  }

  const agents = (agentIds ?? []).map((id, i) => {
    const result = agentsData?.[i];
    const data = result?.status === "success" ? (result.result as AgentOnChain) : null;
    return { id, data };
  }).filter((a) => a.data && a.data.owner !== "0x0000000000000000000000000000000000000000");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Your Agents</h1>
          <p className="text-muted-foreground">Manage your AI agent passports</p>
        </div>
        <Link href="/dashboard/agents/new">
          <Button>Create Agent</Button>
        </Link>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-4">
              No agents yet. Create your first one on-chain!
            </p>
            <Link href="/dashboard/agents/new">
              <Button>Create Agent</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(({ id, data }) => (
            <Link key={id.toString()} href={`/dashboard/agents/${id.toString()}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{data!.name}</CardTitle>
                    <Badge variant={data!.active ? "default" : "secondary"}>
                      {data!.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {data!.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    {keyMap[id.toString()] ? (
                      <span>Key: {keyMap[id.toString()]}…</span>
                    ) : (
                      <span className="italic">No API key yet</span>
                    )}
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                    <span>On-chain ID: #{id.toString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
