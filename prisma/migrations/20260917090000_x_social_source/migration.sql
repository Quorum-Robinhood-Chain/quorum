-- Adds a "social" source type for monitored X/Twitter accounts, alongside the
-- existing "news" (RSS) and "api" types. `handle` stores the X username for
-- those sources; unused (NULL) for news/api sources.

ALTER TYPE "SourceType" ADD VALUE 'social';

ALTER TABLE "Source" ADD COLUMN "handle" TEXT;

CREATE INDEX "Source_type_handle_idx" ON "Source"("type", "handle");
