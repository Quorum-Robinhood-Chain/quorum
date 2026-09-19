-- Backfill: remove em dashes from existing articles.
--
-- New articles are cleaned on save (lib/text-clean.ts, called from
-- lib/llm/generate.ts). This migration cleans the rows created before that.
-- Same rules as the app code:
--   headline: first dash -> ': ', any further dash -> ', '
--   dek/body: every dash -> ', '
-- Dash = em dash, horizontal bar, '--', or a spaced en dash. En dashes in
-- ranges (5–10) are left alone. Only rows that contain a dash are touched.

-- Headline: first occurrence only (no 'g' flag), then the rest.
UPDATE "Article"
SET "headline" = regexp_replace(
      regexp_replace("headline", '[ \t]*(—|―|--)[ \t]*|[ \t]+–[ \t]+', ': '),
      '[ \t]*(—|―|--)[ \t]*|[ \t]+–[ \t]+', ', ', 'g')
WHERE "headline" ~ '—|―|--|[ \t]–[ \t]';

UPDATE "Article"
SET "dek" = regexp_replace("dek", '[ \t]*(—|―|--)[ \t]*|[ \t]+–[ \t]+', ', ', 'g')
WHERE "dek" ~ '—|―|--|[ \t]–[ \t]';

UPDATE "Article"
SET "body" = regexp_replace("body", '[ \t]*(—|―|--)[ \t]*|[ \t]+–[ \t]+', ', ', 'g')
WHERE "body" ~ '—|―|--|[ \t]–[ \t]';

-- Tidy separators left behind (", ," and ", ." etc.).
UPDATE "Article"
SET "headline" = regexp_replace(regexp_replace("headline", ',[ \t]*,', ',', 'g'), ',[ \t]*([.!?:;])', '\1', 'g'),
    "dek"      = regexp_replace(regexp_replace("dek",      ',[ \t]*,', ',', 'g'), ',[ \t]*([.!?:;])', '\1', 'g'),
    "body"     = regexp_replace(regexp_replace("body",     ',[ \t]*,', ',', 'g'), ',[ \t]*([.!?:;])', '\1', 'g')
WHERE "headline" ~ ',[ \t]*(,|[.!?:;])' OR "dek" ~ ',[ \t]*(,|[.!?:;])' OR "body" ~ ',[ \t]*(,|[.!?:;])';
