-- Moves Article to an auto-publish model: automated drafts go live immediately
-- instead of waiting on manual review. `draft`/`reviewed` articles are backfilled
-- to `published` (using generatedAt as publishedAt if it was never set);
-- `rejected` articles become `unpublished`, which is now the reversible
-- emergency-takedown state an admin can also reach from `published`.

-- AddColumn
ALTER TABLE "Article" ADD COLUMN "flagged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Article" ADD COLUMN "flagReason" TEXT;
ALTER TABLE "Article" ADD COLUMN "unpublishedAt" TIMESTAMP(3);

-- Backfill publishedAt for anything that was never published under the old flow,
-- so existing rows immediately satisfy the 1-hour gate window correctly.
UPDATE "Article" SET "publishedAt" = "generatedAt" WHERE "publishedAt" IS NULL;

-- RenameEnum: rebuild ArticleStatus with only published/unpublished
ALTER TYPE "ArticleStatus" RENAME TO "ArticleStatus_old";
CREATE TYPE "ArticleStatus" AS ENUM ('published', 'unpublished');

ALTER TABLE "Article" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Article" ALTER COLUMN "status" TYPE "ArticleStatus" USING (
  CASE "status"::text
    WHEN 'rejected' THEN 'unpublished'
    ELSE 'published'
  END
)::"ArticleStatus";
ALTER TABLE "Article" ALTER COLUMN "status" SET DEFAULT 'published';

DROP TYPE "ArticleStatus_old";

-- DropColumn: reviewedAt is superseded by publishedAt/unpublishedAt
ALTER TABLE "Article" DROP COLUMN IF EXISTS "reviewedAt";
