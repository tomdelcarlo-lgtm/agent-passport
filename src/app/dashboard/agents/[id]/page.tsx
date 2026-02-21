"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AGENT_PASSPORT_ABI, AGENT_PASSPORT_ADDRESS } from "@/lib/contract";
import { wagmiConfig } from "@/lib/wagmi";

interface VerifyLog {
  id: string;
  scope: string;
  service: string;
  status: string;
  ip: string;
  createdAt: string;
}

type ChainPermission = {
  scope: string;
  exists: boolean;
  granted: boolean;
  createdAt: bigint;
};

const SUGGESTED_SCOPES = [
  "email:read", "email:send", "calendar:read", "calendar:write",
  "social:read", "social:post", "files:read", "files:write",
  "payment:read", "payment:create", "contacts:read", "contacts:write",
  "analytics:read", "notifications:send",
];

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const agentId = BigInt(id);
  const router = useRouter();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [newScope, setNewScope] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [keyPrefix, setKeyPrefix] = useState<string | null>(null);
  const [verifyLogs, setVerifyLogs] = useState<VerifyLog[]>([]);
  const [txPending, setTxPending] = useState(false);

  // Read agent from contract
  const { data: agent, refetch: refetchAgent } = useReadContract({
    address: AGENT_PASSPORT_ADDRESS,
    abi: AGENT_PASSPORT_ABI,
    functionName: "getAgent",
    args: [agentId],
  });

  // Read permissions from contract
  const { data: permissions, refetch: refetchPerms } = useReadContract({
    address: AGENT_PASSPORT_ADDRESS,
    abi: AGENT_PASSPORT_ABI,
    functionName: "getPermissions",
    args: [agentId],
  });

  // Load off-chain data: API key prefix + verify logs
  useEffect(() => {
    fetch(`/api/agents/${id}/logs`)
      .then((r) => r.json())
      .then((data) => {
        setKeyPrefix(data.keyPrefix ?? null);
        setVerifyLogs(data.logs ?? []);
      })
      .catch(() => {});
  }, [id]);

  // Redirect if agent doesn't exist or caller is not the owner
  useEffect(() => {
    if (!agent) return;
    if (agent.owner === "0x0000000000000000000000000000000000000000") {
      router.push("/dashboard");
      return;
    }
    if (address && agent.owner.toLowerCase() !== address.toLowerCase()) {
      toast.error("You don't own this agent");
      router.push("/dashboard");
    }
  }, [agent, address, router]);

  async function sendTx(fn: () => Promise<`0x${string}`>, successMsg: string) {
    setTxPending(true);
    try {
      const hash = await fn();
      toast.info("Transaction submitted…");
      await waitForTransactionReceipt(wagmiConfig, { hash });
      toast.success(successMsg);
      await refetchAgent();
      await refetchPerms();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      if (msg.includes("User rejected") || msg.includes("user rejected")) {
        toast.error("Transaction rejected");
      } else {
        toast.error(msg);
      }
    } finally {
      setTxPending(false);
    }
  }

  async function grantPermission(scope: string) {
    if (!scope.trim()) return;
    await sendTx(
      () =>
        writeContractAsync({
          address: AGENT_PASSPORT_ADDRESS,
          abi: AGENT_PASSPORT_ABI,
          functionName: "grantPermission",
          args: [agentId, scope.trim()],
        }),
      `Permission "${scope.trim()}" granted`,
    );
    setNewScope("");
  }

  async function revokePermission(scope: string) {
    await sendTx(
      () =>
        writeContractAsync({
          address: AGENT_PASSPORT_ADDRESS,
          abi: AGENT_PASSPORT_ABI,
          functionName: "revokePermission",
          args: [agentId, scope],
        }),
      `Permission "${scope}" revoked`,
    );
  }

  async function togglePermission(perm: ChainPermission) {
    if (perm.granted) {
      await revokePermission(perm.scope);
    } else {
      await grantPermission(perm.scope);
    }
  }

  async function deactivate() {
    await sendTx(
      () =>
        writeContractAsync({
          address: AGENT_PASSPORT_ADDRESS,
          abi: AGENT_PASSPORT_ABI,
          functionName: "deactivateAgent",
          args: [agentId],
        }),
      "Agent deactivated",
    );
  }

  async function regenerateKey() {
    if (!address) return;
    try {
      const res = await fetch(`/api/agents/${id}/regenerate-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewApiKey(data.apiKey);
      toast.success("New API key generated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to regenerate key");
    }
  }

  if (!agent || agent.owner === "0x0000000000000000000000000000000000000000") {
    return <div className="flex justify-center py-20 text-muted-foreground">Loading agent…</div>;
  }

  const statusColor = agent.active ? "bg-emerald-500" : "bg-gray-400";
  const perms = (permissions ?? []) as ChainPermission[];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Passport Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-200 text-sm font-medium uppercase tracking-wider mb-1">
                Agent Passport · On-chain #{id}
              </p>
              <h1 className="text-3xl font-bold">{agent.name}</h1>
              <p className="text-blue-100 mt-1">{agent.description || "No description"}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${statusColor}`} />
              <span className="text-sm">{agent.active ? "Active" : "Inactive"}</span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-blue-200">API Key Prefix</p>
              <p className="font-mono font-bold">
                {keyPrefix ? `${keyPrefix}…` : <span className="italic font-normal">no key</span>}
              </p>
            </div>
            <div>
              <p className="text-blue-200">Permissions</p>
              <p className="font-bold">{perms.length}</p>
            </div>
            <div>
              <p className="text-blue-200">Verifications</p>
              <p className="font-bold">{verifyLogs.length}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-500/30 text-xs text-blue-200">
            Created {new Date(Number(agent.createdAt) * 1000).toLocaleDateString()}
          </div>
        </div>
      </Card>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        {agent.active && (
          <div className="flex items-center gap-2">
            <Switch
              checked={agent.active}
              onCheckedChange={deactivate}
              disabled={txPending}
            />
            <span className="text-sm">Active (click to deactivate)</span>
          </div>
        )}
        {!agent.active && (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            Inactive — deactivation is permanent on-chain
          </Badge>
        )}
        <Button variant="outline" size="sm" onClick={regenerateKey} disabled={txPending}>
          Regenerate API Key
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="permissions">
        <TabsList>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="logs">Verification Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Permission</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newScope}
                  onChange={(e) => setNewScope(e.target.value)}
                  placeholder="e.g., email:read"
                  onKeyDown={(e) => e.key === "Enter" && grantPermission(newScope)}
                  disabled={txPending}
                />
                <Button
                  onClick={() => grantPermission(newScope)}
                  disabled={!newScope.trim() || txPending}
                >
                  Grant
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_SCOPES.filter((s) => !perms.some((p) => p.scope === s && p.granted)).map(
                  (scope) => (
                    <Badge
                      key={scope}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => !txPending && grantPermission(scope)}
                    >
                      + {scope}
                    </Badge>
                  ),
                )}
              </div>
              {txPending && (
                <p className="text-xs text-muted-foreground mt-3 animate-pulse">
                  Waiting for transaction confirmation…
                </p>
              )}
            </CardContent>
          </Card>

          {perms.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No permissions yet. Add some above — each one requires a MetaMask signature.
            </p>
          ) : (
            <div className="space-y-2">
              {perms.map((perm) => (
                <div
                  key={perm.scope}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={perm.granted ? "default" : "destructive"}>
                      {perm.granted ? "Allowed" : "Denied"}
                    </Badge>
                    <span className="font-mono text-sm">{perm.scope}</span>
                  </div>
                  <Switch
                    checked={perm.granted}
                    onCheckedChange={() => togglePermission(perm)}
                    disabled={txPending}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          {verifyLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No verification logs yet.</p>
          ) : (
            <div className="space-y-2">
              {verifyLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg border text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        log.status === "allowed"
                          ? "default"
                          : log.status === "denied"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {log.status}
                    </Badge>
                    <span className="font-mono">{log.scope}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Regenerate Key Dialog */}
      <Dialog open={!!newApiKey} onOpenChange={() => setNewApiKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New API Key</DialogTitle>
            <DialogDescription>
              Your old key is now invalid. Copy the new key — it won&apos;t be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-lg bg-muted font-mono text-sm break-all select-all">
            {newApiKey}
          </div>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(newApiKey!);
              toast.success("Copied!");
            }}
          >
            Copy Key
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
