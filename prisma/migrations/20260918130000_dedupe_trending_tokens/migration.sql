-- Cleanup: remove `trending` rows that duplicate a token already tracked
-- under another category (stock_token, defi, meme).
--
-- sync-trending-tokens.ts originally only checked new Dexscreener candidates
-- against stock_token addresses before inserting them, so an already-known
-- defi/meme token (e.g. USDG, wBTC) could get re-inserted as a SECOND row
-- under category = 'trending' — same symbol, showing up twice on /tokens,
-- with the trending copy stuck on whatever stale `dex` label it was created
-- with (e.g. "Robinhood Chain (Blockscout)"). The sync job is now fixed to
-- check every category and to self-clean these duplicates going forward —
-- this migration removes the ones that already exist.
DELETE FROM "Token" t
WHERE t."category" = 'trending'
  AND EXISTS (
    SELECT 1
    FROM "Token" other
    WHERE other."category" IN ('stock_token', 'defi', 'meme')
      AND (
        lower(other."symbol") = lower(t."symbol")
        OR (
          t."contractAddress" IS NOT NULL
          AND lower(other."contractAddress") = lower(t."contractAddress")
        )
      )
  );
