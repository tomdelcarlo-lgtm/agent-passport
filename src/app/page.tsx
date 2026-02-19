"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) router.push("/dashboard");
  }, [isConnected, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Agent Passport</h1>
          <ConnectButton />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 py-20 text-center max-w-3xl">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            On-chain Identity for AI Agents · Base Sepolia
          </div>
          <h2 className="text-5xl font-bold tracking-tight mb-6">
            Give your AI agents a trusted identity
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Create passports for your AI agents on-chain. Control their permissions immutably.
            Let services verify them with a single API call — no central authority needed.
          </p>
          <div className="flex gap-4 justify-center">
            <ConnectButton label="Connect Wallet to Start" />
          </div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-6 rounded-lg border bg-card">
              <div className="text-2xl mb-3">&#128274;</div>
              <h3 className="font-semibold mb-2">Immutable on Base</h3>
              <p className="text-sm text-muted-foreground">
                Agent identities and permissions are stored on Base Sepolia (L2). Publicly
                verifiable, censorship-resistant, and cheap to use.
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <div className="text-2xl mb-3">&#9989;</div>
              <h3 className="font-semibold mb-2">Granular Permissions</h3>
              <p className="text-sm text-muted-foreground">
                Define exactly what each agent can do. Sign grant/revoke transactions with
                MetaMask — you own your agents&apos; identity.
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <div className="text-2xl mb-3">&#128640;</div>
              <h3 className="font-semibold mb-2">Simple Verification</h3>
              <p className="text-sm text-muted-foreground">
                Services verify agents with one GET request. Unknown scopes trigger approval
                requests — you stay in control.
              </p>
            </div>
          </div>

          <div className="mt-16 p-6 rounded-lg border bg-muted/50 text-left space-y-2">
            <p className="text-sm font-mono text-muted-foreground">Verify an agent:</p>
            <code className="text-sm font-mono block">
              GET /api/verify?key=ap_XXXXXXXX...&amp;scope=email:read
            </code>
            <p className="text-xs text-muted-foreground">
              Reads directly from the AgentPassport smart contract on Base Sepolia.
            </p>
          </div>

          <div className="mt-8 text-xs text-muted-foreground">
            <Link
              href="https://sepolia.basescan.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              View on BaseScan ↗
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
