import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import { getAddress } from "viem";

describe("AgentPassport", async function () {
  const { viem } = await network.connect();
  const [owner, other] = await viem.getWalletClients();

  async function deploy() {
    return viem.deployContract("AgentPassport");
  }

  describe("createAgent", async function () {
    it("stores agent data and emits AgentCreated", async function () {
      const contract = await deploy();

      const hash = await contract.write.createAgent(["TestAgent", "A test agent"]);
      const receipt = await (await viem.getPublicClient()).waitForTransactionReceipt({ hash });

      // find AgentCreated log
      const log = receipt.logs.find((l) => l.topics[0] !== undefined);
      assert.ok(log, "AgentCreated event should be emitted");

      const agent = await contract.read.getAgent([1n]);
      assert.equal(agent.name, "TestAgent");
      assert.equal(agent.description, "A test agent");
      assert.equal(agent.active, true);
      assert.equal(getAddress(agent.owner), getAddress(owner.account.address));
    });

    it("increments agentId for each new agent", async function () {
      const contract = await deploy();
      await contract.write.createAgent(["Agent1", "First"]);
      await contract.write.createAgent(["Agent2", "Second"]);

      const a1 = await contract.read.getAgent([1n]);
      const a2 = await contract.read.getAgent([2n]);
      assert.equal(a1.name, "Agent1");
      assert.equal(a2.name, "Agent2");
    });
  });

  describe("getMyAgents / getAgentsByOwner", async function () {
    it("returns agentIds for owner", async function () {
      const contract = await deploy();
      await contract.write.createAgent(["A1", "d"]);
      await contract.write.createAgent(["A2", "d"]);

      const ids = await contract.read.getMyAgents();
      assert.deepEqual(ids, [1n, 2n]);
    });

    it("returns empty for address with no agents", async function () {
      const contract = await deploy();
      const ids = await contract.read.getAgentsByOwner([other.account.address]);
      assert.deepEqual(ids, []);
    });
  });

  describe("grantPermission", async function () {
    it("grants a permission and records it", async function () {
      const contract = await deploy();
      await contract.write.createAgent(["Agent", "d"]);
      await contract.write.grantPermission([1n, "email:read"]);

      const perm = await contract.read.getPermission([1n, "email:read"]);
      assert.equal(perm.exists, true);
      assert.equal(perm.granted, true);
      assert.equal(perm.scope, "email:read");
    });

    it("reverts if caller is not the owner", async function () {
      const contract = await deploy();
      await contract.write.createAgent(["Agent", "d"]);

      try {
        await contract.write.grantPermission([1n, "email:read"], {
          account: other.account,
        });
        assert.fail("Should have reverted");
      } catch (e: unknown) {
        assert.ok(e instanceof Error, "Expected an error");
        assert.ok(
          e.message.includes("NotAgentOwner") || e.message.includes("revert"),
          `Unexpected error: ${e.message}`,
        );
      }
    });
  });

  describe("revokePermission", async function () {
    it("revokes a granted permission", async function () {
      const contract = await deploy();
      await contract.write.createAgent(["Agent", "d"]);
      await contract.write.grantPermission([1n, "email:read"]);
      await contract.write.revokePermission([1n, "email:read"]);

      const perm = await contract.read.getPermission([1n, "email:read"]);
      assert.equal(perm.exists, true);
      assert.equal(perm.granted, false);
    });
  });

  describe("verifyPermission", async function () {
    it("returns true for granted permission on active agent", async function () {
      const contract = await deploy();
      await contract.write.createAgent(["Agent", "d"]);
      await contract.write.grantPermission([1n, "email:read"]);

      const result = await contract.read.verifyPermission([1n, "email:read"]);
      assert.equal(result, true);
    });

    it("returns false for revoked permission", async function () {
      const contract = await deploy();
      await contract.write.createAgent(["Agent", "d"]);
      await contract.write.grantPermission([1n, "email:read"]);
      await contract.write.revokePermission([1n, "email:read"]);

      const result = await contract.read.verifyPermission([1n, "email:read"]);
      assert.equal(result, false);
    });

    it("returns false for non-existent permission", async function () {
      const contract = await deploy();
      await contract.write.createAgent(["Agent", "d"]);

      const result = await contract.read.verifyPermission([1n, "email:read"]);
      assert.equal(result, false);
    });

    it("returns false when agent is inactive", async function () {
      const contract = await deploy();
      await contract.write.createAgent(["Agent", "d"]);
      await contract.write.grantPermission([1n, "email:read"]);
      await contract.write.deactivateAgent([1n]);

      const result = await contract.read.verifyPermission([1n, "email:read"]);
      assert.equal(result, false);
    });
  });

  describe("getPermissions", async function () {
    it("returns all scopes ever touched", async function () {
      const contract = await deploy();
      await contract.write.createAgent(["Agent", "d"]);
      await contract.write.grantPermission([1n, "email:read"]);
      await contract.write.grantPermission([1n, "calendar:write"]);
      await contract.write.revokePermission([1n, "email:read"]);

      const perms = await contract.read.getPermissions([1n]);
      assert.equal(perms.length, 2);

      const emailPerm = perms.find((p) => p.scope === "email:read");
      assert.ok(emailPerm, "email:read should be in permissions");
      assert.equal(emailPerm!.granted, false); // was revoked

      const calPerm = perms.find((p) => p.scope === "calendar:write");
      assert.ok(calPerm, "calendar:write should be in permissions");
      assert.equal(calPerm!.granted, true);
    });
  });

  describe("deactivateAgent", async function () {
    it("marks agent as inactive", async function () {
      const contract = await deploy();
      await contract.write.createAgent(["Agent", "d"]);
      await contract.write.deactivateAgent([1n]);

      const agent = await contract.read.getAgent([1n]);
      assert.equal(agent.active, false);
    });

    it("reverts when already inactive", async function () {
      const contract = await deploy();
      await contract.write.createAgent(["Agent", "d"]);
      await contract.write.deactivateAgent([1n]);

      try {
        await contract.write.deactivateAgent([1n]);
        assert.fail("Should have reverted");
      } catch (e: unknown) {
        assert.ok(e instanceof Error, "Expected an error");
        assert.ok(
          e.message.includes("AgentAlreadyInactive") || e.message.includes("revert"),
          `Unexpected error: ${e.message}`,
        );
      }
    });
  });
});
