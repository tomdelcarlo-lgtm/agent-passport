import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { hardhat, base } from "wagmi/chains";
// import { baseSepolia } from "wagmi/chains"; // ← uncomment for Base Sepolia testnet
import { http } from "wagmi";

export const wagmiConfig = getDefaultConfig({
  appName: "Agent Passport",
  // Get a free projectId at https://cloud.walletconnect.com
  // Not required for MetaMask on localhost.
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "local-dev-no-wc",
  chains: [
    hardhat,
    // base,       // ← uncomment for Base mainnet
    // baseSepolia, // ← uncomment for Base Sepolia testnet
  ],
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    // [base.id]: http(
    //   process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://mainnet.base.org",
    // ),
    // [baseSepolia.id]: http(
    //   process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org",
    // ),
  },
  ssr: false,
});
