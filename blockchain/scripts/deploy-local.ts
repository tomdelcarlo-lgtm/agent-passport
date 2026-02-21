/**
 * Deploy AgentPassport to the local Hardhat node and auto-update .env.local.
 *
 * Called automatically by: npm run dev:local
 * Manual usage: cd blockchain && npx hardhat run scripts/deploy-local.ts --network localhost
 */
import { network } from "hardhat";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const { viem } = await network.connect();

console.log("Deploying AgentPassport to localhost…");
const [deployer] = await viem.getWalletClients();
console.log(`Deployer: ${deployer.account.address}`);

const agentPassport = await viem.deployContract("AgentPassport");
const address = agentPassport.address;

console.log(`\n✅ AgentPassport deployed at: ${address}`);

// ─── Write address to .env.local ─────────────────────────────────────────────
const envPath = resolve(ROOT, ".env.local");
let content = existsSync(envPath) ? readFileSync(envPath, "utf-8") : "";

const newLine = `NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`;

if (content.match(/^NEXT_PUBLIC_CONTRACT_ADDRESS=.*/m)) {
  content = content.replace(/^NEXT_PUBLIC_CONTRACT_ADDRESS=.*/m, newLine);
} else {
  content = content.trimEnd() + (content ? "\n" : "") + newLine + "\n";
}

writeFileSync(envPath, content, "utf-8");
console.log(`📝 .env.local updated → NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
