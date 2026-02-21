"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { parseEventLogs } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AGENT_PASSPORT_ABI, AGENT_PASSPORT_ADDRESS } from "@/lib/contract";
import { wagmiConfig } from "@/lib/wagmi";

type Step = "idle" | "signing" | "confirming" | "creating-key" | "done";

export default function NewAgentPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [step, setStep] = useState<Step>("idle");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!address) return;

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!name) {
      toast.error("Agent name is required");
      return;
    }

    try {
      // Step 1: Sign + send the createAgent transaction
      setStep("signing");
      const hash = await writeContractAsync({
        address: AGENT_PASSPORT_ADDRESS,
        abi: AGENT_PASSPORT_ABI,
        functionName: "createAgent",
        args: [name, description],
      });

      // Step 2: Wait for the transaction to be confirmed
      setStep("confirming");
      toast.info("Transaction submitted — waiting for confirmation…");

      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });

      // Step 3: Parse the AgentCreated event to get the on-chain agentId
      const logs = parseEventLogs({
        abi: AGENT_PASSPORT_ABI,
        eventName: "AgentCreated",
        logs: receipt.logs,
      });

      const agentId = logs[0]?.args?.agentId?.toString();
      if (!agentId) {
        throw new Error("Could not read agentId from transaction receipt");
      }

      toast.success(`Agent created on-chain (ID #${agentId})`);

      // Step 4: Create the off-chain API key linked to this on-chain agentId
      setStep("creating-key");
      const res = await fetch("/api/agents/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, walletAddress: address }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create API key");

      setApiKey(data.apiKey);
      setStep("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg.includes("User rejected") || msg.includes("user rejected")) {
        toast.error("Transaction rejected");
      } else {
        toast.error(msg);
      }
      setStep("idle");
    }
  }

  function copyKey() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  const loading = step !== "idle" && step !== "done";

  const stepLabel: Record<Step, string> = {
    idle: "Create Agent",
    signing: "Waiting for signature…",
    confirming: "Confirming on-chain…",
    "creating-key": "Generating API key…",
    done: "Done!",
  };

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create Agent</CardTitle>
          <CardDescription>
            This registers a new AI agent passport on-chain. You&apos;ll sign one
            transaction with MetaMask, then receive an off-chain API key for verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input id="name" name="name" required placeholder="e.g., Email Assistant" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="What does this agent do?"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {stepLabel[step]}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={step === "done" && !!apiKey} onOpenChange={() => router.push("/dashboard")}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Agent Created Successfully!</DialogTitle>
            <DialogDescription>
              Your agent is now registered on Base Sepolia. Copy your API key — it will only be
              shown once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted font-mono text-sm break-all select-all">
              {apiKey}
            </div>
            <div className="flex gap-2">
              <Button onClick={copyKey} className="flex-1">
                {copied ? "Copied!" : "Copy API Key"}
              </Button>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Done
              </Button>
            </div>
            <p className="text-sm text-destructive font-medium">
              Make sure to save this key — you won&apos;t be able to see it again!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
