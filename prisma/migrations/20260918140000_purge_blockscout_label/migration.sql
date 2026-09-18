-- Hard guarantee: no Token row may keep a "Blockscout" source label,
-- regardless of category. Earlier migrations covered the two known cases
-- (stale `trending` rows never re-labeled, and duplicate `trending` rows
-- shadowing a stock_token/defi/meme token) — this is a blanket catch-all so
-- nothing slips through if a "Blockscout" label ever existed anywhere else.
--
-- No code in this codebase writes "Blockscout" into `dex` anymore
-- (lib/market/blockscout.ts is unused dead code, imported nowhere — see
-- sync-trending-tokens.ts, which is 100% Dexscreener-sourced now), so this
-- is a one-time data cleanup, not something that needs to run repeatedly.
UPDATE "Token"
SET "dex" = 'Robinhood Chain (Dexscreener)'
WHERE "dex" ILIKE '%blockscout%';
