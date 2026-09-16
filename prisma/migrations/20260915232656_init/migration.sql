-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('news', 'api');

-- CreateEnum
CREATE TYPE "Metric" AS ENUM ('tvl', 'volume_24h', 'price', 'price_change_24h', 'apy', 'active_protocols', 'new_tokens_24h', 'gas_fee_avg', 'dex_volume_rank', 'tx_count');

-- CreateEnum
CREATE TYPE "TokenCategory" AS ENUM ('stock_token', 'meme', 'defi', 'other');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('draft', 'reviewed', 'published', 'rejected');

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "SourceType" NOT NULL DEFAULT 'news',
    "feedUrl" TEXT,
    "pollingIntervalMinutes" INTEGER NOT NULL DEFAULT 20,
    "robotsCheckedAt" TIMESTAMP(3),
    "tosNotes" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawItem" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "url" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRelevant" BOOLEAN NOT NULL DEFAULT false,
    "usedInArticle" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RawItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSnapshot" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "metric" "Metric" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "source" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contractAddress" TEXT,
    "dex" TEXT,
    "category" "TokenCategory" NOT NULL,
    "isTracked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "dek" TEXT,
    "body" TEXT NOT NULL,
    "automated" BOOLEAN NOT NULL DEFAULT true,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "sourceNames" TEXT[],
    "sourceUrls" TEXT[],
    "generationInputs" TEXT[],
    "status" "ArticleStatus" NOT NULL DEFAULT 'draft',
    "reviewerId" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Editor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',

    CONSTRAINT "Editor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_name_key" ON "Source"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RawItem_url_key" ON "RawItem"("url");

-- CreateIndex
CREATE UNIQUE INDEX "RawItem_dedupeKey_key" ON "RawItem"("dedupeKey");

-- CreateIndex
CREATE INDEX "RawItem_isRelevant_usedInArticle_idx" ON "RawItem"("isRelevant", "usedInArticle");

-- CreateIndex
CREATE INDEX "MarketSnapshot_scope_metric_timestamp_idx" ON "MarketSnapshot"("scope", "metric", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Token_symbol_contractAddress_key" ON "Token"("symbol", "contractAddress");

-- CreateIndex
CREATE INDEX "Article_status_generatedAt_idx" ON "Article"("status", "generatedAt");

-- CreateIndex
CREATE INDEX "Article_category_publishedAt_idx" ON "Article"("category", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Editor_username_key" ON "Editor"("username");

-- AddForeignKey
ALTER TABLE "RawItem" ADD CONSTRAINT "RawItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Editor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
