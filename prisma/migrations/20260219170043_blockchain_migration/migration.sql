-- CreateTable
CREATE TABLE "AgentKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VerifyLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "service" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL,
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerifyLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentKey" ("agentId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "service" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notification_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentKey" ("agentId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentKey_agentId_key" ON "AgentKey"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentKey_keyPrefix_key" ON "AgentKey"("keyPrefix");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_agentId_scope_status_key" ON "Notification"("agentId", "scope", "status");
