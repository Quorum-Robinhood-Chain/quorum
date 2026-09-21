-- Backfill: normalize the `dex` source label on existing `trending` tokens.
--
-- Before this, `syncTrendingTokens()` (lib/market/sync-trending-tokens.ts)
-- only wrote `dex = 'Robinhood Chain (Dexscreener)'` for tokens that showed
-- up in that run's fresh Dexscreener discovery window. Tokens that were
-- re-verified and kept from a previous run ("verifiedKept") were never
-- updated, so any row created back when discovery still went through
-- Blockscout kept its old `dex` value forever (e.g. still showing
-- "Blockscout" as the source in the UI, even though price/volume have come
-- from Dexscreener for a long time). The sync job itself is now fixed to
-- keep this in sync going forward — this migration just cleans up rows that
-- already exist.
UPDATE "Token"
SET "dex" = 'Robinhood Chain (Dexscreener)'
WHERE "category" = 'trending'
  AND ("dex" IS NULL OR "dex" <> 'Robinhood Chain (Dexscreener)');
