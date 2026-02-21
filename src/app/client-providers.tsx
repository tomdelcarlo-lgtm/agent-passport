"use client";

/**
 * Wraps the wallet providers (WagmiProvider + RainbowKitProvider) in a
 * dynamic import with ssr: false so they never run on the server.
 *
 * The wallet connector SDKs (especially Coinbase Wallet via @base-org/account)
 * call localStorage.getItem during initialization, which throws on the server.
 * Preventing the entire provider tree from SSR-rendering is the correct fix.
 */
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const WalletProviders = dynamic(
  () => import("./providers").then((m) => ({ default: m.Providers })),
  { ssr: false },
);

export function ClientProviders({ children }: { children: ReactNode }) {
  return <WalletProviders>{children}</WalletProviders>;
}
