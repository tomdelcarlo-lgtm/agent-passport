"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Notification {
  id: string;
  scope: string;
  service: string;
  status: string;
  createdAt: string;
  agent: { id: string; name: string };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  function fetchNotifications() {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then(setNotifications)
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchNotifications(); }, []);

  async function handleAction(id: string, action: "approve" | "deny") {
    const res = await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (res.ok) {
      toast.success(action === "approve" ? "Permission approved" : "Permission denied");
      fetchNotifications();
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20 text-muted-foreground">Loading notifications...</div>;
  }

  const pending = notifications.filter((n) => n.status === "pending");
  const resolved = notifications.filter((n) => n.status !== "pending");

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Notifications</h1>
      <p className="text-muted-foreground mb-6">
        Approve or deny permission requests from services trying to access your agents.
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
                    <span className="text-primary">{n.agent.name}</span> requests{" "}
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
                  <Button size="sm" onClick={() => handleAction(n.id, "approve")}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction(n.id, "deny")}>
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
                    <span>{n.agent.name}</span> -{" "}
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
