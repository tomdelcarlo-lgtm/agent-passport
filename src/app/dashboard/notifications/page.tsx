"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AGENT_PASSPORT_ABI, AGENT_PASSPORT_ADDRESS } from "@/lib/contract";
import { wagmiConfig } from "@/lib/wagmi";

interface Notification {
  id: string;
  agentId: string;
  scope: string;
  service: string;
  status: string;
  createdAt: string;
  agentKey: { agentId: string };
}

export default function NotificationsPage() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function fetchNotifications() {
    if (!address) return;
    fetch(`/api/notifications?wallet=${address}`)
      .then((r) => r.json())
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchNotifications();
  }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleApprove(n: Notification) {
    setPendingId(n.id);
    try {
      // 1. Sign + send grantPermission on-chain
      const hash = await writeContractAsync({
        address: AGENT_PASSPORT_ADDRESS,
        abi: AGENT_PASSPORT_ABI,
        functionName: "grantPermission",
        args: [BigInt(n.agentId), n.scope],
      });

      toast.info("Transaction submitted — waiting for confirmation…");
      await waitForTransactionReceipt(wagmiConfig, { hash });

      // 2. Update notification status in DB
      await fetch(`/api/notifications/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", walletAddress: address }),
      });

      toast.success(`Permission "${n.scope}" approved on-chain`);
      fetchNotifications();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      if (msg.includes("User rejected") || msg.includes("user rejected")) {
        toast.error("Transaction rejected");
      } else {
        toast.error(msg);
      }
    } finally {
      setPendingId(null);
    }
  }

  async function handleDeny(n: Notification) {
    setPendingId(n.id);
    try {
      const res = await fetch(`/api/notifications/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deny", walletAddress: address }),
      });

      if (!res.ok) throw new Error("Failed to deny");
      toast.success(`Permission "${n.scope}" denied`);
      fetchNotifications();
    } catch {
      toast.error("Failed to deny permission");
    } finally {
      setPendingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        Loading notifications…
      </div>
    );
  }

  const pending = notifications.filter((n) => n.status === "pending");
  const resolved = notifications.filter((n) => n.status !== "pending");

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Notifications</h1>
      <p className="text-muted-foreground mb-6">
        Approve or deny permission requests. Approvals require a MetaMask signature to grant
        on-chain.
      </p>

      {pending.length === 0 && resolved.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No notifications yet. They&apos;ll appear when services request new permissions.
          </CardContent>
        </Card>
      )}

      {pending.length > 0 && (
        <div className="space-y-3 mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Pending ({pending.length})
          </h2>
          {pending.map((n) => (
            <Card key={n.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">
                    Agent <span className="text-primary">#{n.agentId}</span> requests{" "}
                    <span className="font-mono">{n.scope}</span>
                  </p>
                  {n.service && (
                    <p className="text-xs text-muted-foreground">Service: {n.service}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(n)}
                    disabled={pendingId === n.id}
                  >
                    {pendingId === n.id ? "Approving…" : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeny(n)}
                    disabled={pendingId === n.id}
                  >
                    Deny
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Resolved ({resolved.length})
          </h2>
          {resolved.map((n) => (
            <Card key={n.id} className="opacity-70">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">
                    Agent <span>#{n.agentId}</span> —{" "}
                    <span className="font-mono">{n.scope}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                <Badge variant={n.status === "approved" ? "default" : "destructive"}>
                  {n.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
