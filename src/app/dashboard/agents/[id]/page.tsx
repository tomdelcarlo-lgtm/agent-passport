"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Permission {
  id: string;
  scope: string;
  service: string;
  granted: boolean;
  createdAt: string;
}

interface VerifyLog {
  id: string;
  scope: string;
  service: string;
  status: string;
  ip: string;
  createdAt: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  keyPrefix: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: Permission[];
  verifyLogs: VerifyLog[];
  _count: { permissions: number; verifyLogs: number };
}

const SUGGESTED_SCOPES = [
  "email:read", "email:send", "calendar:read", "calendar:write",
  "social:read", "social:post", "files:read", "files:write",
  "payment:read", "payment:create", "contacts:read", "contacts:write",
  "analytics:read", "notifications:send",
];

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [newScope, setNewScope] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function fetchAgent() {
    fetch(`/api/agents/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setAgent)
      .catch(() => router.push("/dashboard"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchAgent(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleActive() {
    if (!agent) return;
    const res = await fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !agent.active }),
    });
    if (res.ok) {
      setAgent({ ...agent, active: !agent.active });
      toast.success(agent.active ? "Agent deactivated" : "Agent activated");
    }
  }

  async function addPermission(scope: string) {
    if (!scope.trim()) return;
    const res = await fetch(`/api/agents/${id}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: scope.trim(), granted: true }),
    });
    if (res.ok) {
      setNewScope("");
      fetchAgent();
      toast.success(`Permission "${scope}" added`);
    }
  }

  async function togglePermission(scope: string, currentGranted: boolean) {
    const res = await fetch(`/api/agents/${id}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, granted: !currentGranted }),
    });
    if (res.ok) {
      fetchAgent();
    }
  }

  async function regenerateKey() {
    const res = await fetch(`/api/agents/${id}/regenerate-key`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setNewApiKey(data.apiKey);
      toast.success("New API key generated");
    }
  }

  async function deleteAgent() {
    const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Agent deleted");
      router.push("/dashboard");
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20 text-muted-foreground">Loading agent...</div>;
  }

  if (!agent) return null;

  const statusColor = agent.active ? "bg-emerald-500" : "bg-gray-400";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Passport Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-200 text-sm font-medium uppercase tracking-wider mb-1">
                Agent Passport
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
              <p className="text-blue-200">Key Prefix</p>
              <p className="font-mono font-bold">{agent.keyPrefix}...</p>
            </div>
            <div>
              <p className="text-blue-200">Permissions</p>
              <p className="font-bold">{agent._count.permissions}</p>
            </div>
            <div>
              <p className="text-blue-200">Verifications</p>
              <p className="font-bold">{agent._count.verifyLogs}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-500/30 text-xs text-blue-200">
            Created {new Date(agent.createdAt).toLocaleDateString()}
          </div>
        </div>
      </Card>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Switch checked={agent.active} onCheckedChange={toggleActive} />
          <span className="text-sm">{agent.active ? "Active" : "Inactive"}</span>
        </div>
        <Button variant="outline" size="sm" onClick={regenerateKey}>
          Regenerate API Key
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
          Delete Agent
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="permissions">
        <TabsList>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="logs">Verification Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="space-y-4 mt-4">
          {/* Add Permission */}
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
                  onKeyDown={(e) => e.key === "Enter" && addPermission(newScope)}
                />
                <Button onClick={() => addPermission(newScope)} disabled={!newScope.trim()}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_SCOPES.filter(
                  (s) => !agent.permissions.some((p) => p.scope === s)
                ).map((scope) => (
                  <Badge
                    key={scope}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => addPermission(scope)}
                  >
                    + {scope}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Permission List */}
          {agent.permissions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No permissions yet. Add some above or they&apos;ll be created when services request access.
            </p>
          ) : (
            <div className="space-y-2">
              {agent.permissions.map((perm) => (
                <div
                  key={perm.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={perm.granted ? "default" : "destructive"}>
                      {perm.granted ? "Allowed" : "Denied"}
                    </Badge>
                    <span className="font-mono text-sm">{perm.scope}</span>
                    {perm.service && (
                      <span className="text-xs text-muted-foreground">({perm.service})</span>
                    )}
                  </div>
                  <Switch
                    checked={perm.granted}
                    onCheckedChange={() => togglePermission(perm.scope, perm.granted)}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          {agent.verifyLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No verification logs yet.</p>
          ) : (
            <div className="space-y-2">
              {agent.verifyLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
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
              Your old key is now invalid. Copy the new key - it won&apos;t be shown again.
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{agent.name}&quot; and all its permissions and logs.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteAgent}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
