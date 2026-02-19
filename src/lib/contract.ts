/**
 * AgentPassport smart contract — ABI + address.
 *
 * Deploy with:  npm run deploy:base-sepolia
 * Then set:     NEXT_PUBLIC_CONTRACT_ADDRESS=0x... in .env.local
 */

export const AGENT_PASSPORT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) ?? "0x0";

export const AGENT_PASSPORT_ABI = [
  // ─── Events ──────────────────────────────────────────────────────────────
  {
    type: "event",
    name: "AgentCreated",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PermissionGranted",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "scope", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PermissionRevoked",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "scope", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AgentDeactivated",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
    ],
  },
  // ─── Errors ───────────────────────────────────────────────────────────────
  {
    type: "error",
    name: "AgentNotFound",
    inputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    type: "error",
    name: "NotAgentOwner",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "caller", type: "address" },
    ],
  },
  {
    type: "error",
    name: "AgentAlreadyInactive",
    inputs: [{ name: "agentId", type: "uint256" }],
  },
  // ─── Write Functions ──────────────────────────────────────────────────────
  {
    type: "function",
    name: "createAgent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "description", type: "string" },
    ],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    type: "function",
    name: "grantPermission",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "scope", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "revokePermission",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "scope", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "deactivateAgent",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [],
  },
  // ─── View Functions ───────────────────────────────────────────────────────
  {
    type: "function",
    name: "verifyPermission",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "scope", type: "string" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "getPermission",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "scope", type: "string" },
    ],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "scope", type: "string" },
          { name: "exists", type: "bool" },
          { name: "granted", type: "bool" },
          { name: "createdAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getPermissions",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { name: "scope", type: "string" },
          { name: "exists", type: "bool" },
          { name: "granted", type: "bool" },
          { name: "createdAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getAgent",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "description", type: "string" },
          { name: "active", type: "bool" },
          { name: "owner", type: "address" },
          { name: "createdAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getMyAgents",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getAgentsByOwner",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256[]" }],
  },
] as const;
