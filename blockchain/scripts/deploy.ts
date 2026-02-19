/**
 * Deploy AgentPassport to Base Sepolia testnet.
 *
 * Usage:
 *   cd blockchain
 *   npx hardhat run scripts/deploy.ts --network base-sepolia
 *
 * After deployment, copy the contract address to your .env.local:
 *   NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
 *
 * To verify on BaseScan:
 *   npx hardhat verify <address> --network base-sepolia
 */
import { network } from "hardhat";

const { viem } = await network.connect();

console.log("Deploying AgentPassport...");
const [deployer] = await viem.getWalletClients();
const publicClient = await viem.getPublicClient();

const balance = await publicClient.getBalance({ address: deployer.account.address });
console.log(`Deployer: ${deployer.account.address}`);
console.log(`Balance:  ${Number(balance) / 1e18} ETH`);

if (balance === 0n) {
  throw new Error(
    "Deployer account has no ETH. Get testnet ETH from https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet",
  );
}

const agentPassport = await viem.deployContract("AgentPassport");

console.log("\n✅ AgentPassport deployed!");
console.log(`Address: ${agentPassport.address}`);
console.log("\nAdd to .env.local:");
console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${agentPassport.address}`);
console.log("\nTo verify on BaseScan:");
console.log(`cd blockchain && npx hardhat verify ${agentPassport.address} --network base-sepolia`);
