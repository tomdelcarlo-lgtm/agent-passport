"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isConnected, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect to home if wallet not connected
  useEffect(() => {
    if (!isConnecting && !isConnected) {
      router.push("/");
    }
  }, [isConnected, isConnecting, router]);

  if (isConnecting || !isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Connecting wallet…
      </div>
    );
  }

  function handleDisconnect() {
    disconnect();
    toast.success("Wallet disconnected");
    router.push("/");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-bold">
              Agent Passport
            </Link>
            <nav className="flex gap-1">
              <Link href="/dashboard">
                <Button variant={pathname === "/dashboard" ? "secondary" : "ghost"} size="sm">
                  Agents
                </Button>
              </Link>
              <Link href="/dashboard/notifications">
                <Button
                  variant={pathname === "/dashboard/notifications" ? "secondary" : "ghost"}
                  size="sm"
                >
                  Notifications
                </Button>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" />
            <Button variant="ghost" size="sm" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
