import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Load .env.local from the project root
const __dirname = dirname(fileURLToPath(import.meta.url));
function loadEnv(filename: string) {
  try {
    const content = readFileSync(resolve(__dirname, "..", filename), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // file not found is fine
  }
}
loadEnv(".env.local");
loadEnv(".env");

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";

const privateKey = process.env.PRIVATE_KEY as `0x${string}` | undefined;

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
    },
  },
  paths: {
    // contracts is symlinked: blockchain/contracts -> ../contracts
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
  },
  networks: {
    // ── Local development (default) ────────────────────────────────────────
    // Started by: npm run dev:local  (runs `hardhat node` automatically)
    localhost: {
      type: "http",
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },

    // ── Base Sepolia testnet ────────────────────────────────────────────────
    // Uncomment when you have testnet ETH.
    // Get ETH: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
    //
    // "base-sepolia": {
    //   type: "http",
    //   url: process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org",
    //   accounts: privateKey ? [privateKey] : [],
    //   chainId: 84532,
    // },
  },
});
