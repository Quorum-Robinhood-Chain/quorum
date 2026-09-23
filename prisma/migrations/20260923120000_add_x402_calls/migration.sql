-- CreateTable
CREATE TABLE "x402_calls" (
    "id" TEXT NOT NULL,
    "agent" VARCHAR(42) NOT NULL,
    "endpoint" TEXT NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "txHash" TEXT,
    "demo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "x402_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "x402_calls_txHash_key" ON "x402_calls"("txHash");

-- CreateIndex
CREATE INDEX "x402_calls_agent_createdAt_idx" ON "x402_calls"("agent", "createdAt");

-- CreateIndex
CREATE INDEX "x402_calls_createdAt_idx" ON "x402_calls"("createdAt");
