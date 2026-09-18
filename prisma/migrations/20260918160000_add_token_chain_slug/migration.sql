-- Add chainSlug: the Dexscreener chain a token's contractAddress actually
-- lives on. NULL is treated as "robinhood" in application code (see
-- lib/market/external-links.ts) — that covers every row that predates this
-- column (trending/meme entries, which are already Robinhood-chain-native).
ALTER TABLE "Token" ADD COLUMN "chainSlug" TEXT;

-- Backfill contractAddress + chainSlug for the curated `defi` tokens, from
-- addresses supplied directly by the site owner (2026-09-18). Only 1INCH's
-- address is actually on Robinhood Chain; the rest are the token's contract
-- on whatever chain it's really deployed on (Ethereum, Base, Solana,
-- Arbitrum, Arc) — chainSlug records that so the link points at a real,
-- resolvable pair instead of a "robinhood" URL for an address that was
-- never deployed there.
UPDATE "Token" SET "contractAddress" = '0xfaa318479b7755b2dbfdd34dc306cb28b420ad12', "chainSlug" = 'ethereum' WHERE "symbol" = 'UNI' AND "category" = 'defi';
UPDATE "Token" SET "contractAddress" = '0xfbee12f66d7aecb32bcd60efae0c49a19855a57f', "chainSlug" = 'robinhood' WHERE "symbol" = '1INCH' AND "category" = 'defi';
UPDATE "Token" SET "contractAddress" = '0xb5f0b4ae66c14f7efaa9aa1468e8fc536a3e288c', "chainSlug" = 'base' WHERE "symbol" = 'MORPHO' AND "category" = 'defi';
UPDATE "Token" SET "contractAddress" = '7ge3sev8rbgz7gcfddiqy6arfdnvzbkvpl9svsq9dytq', "chainSlug" = 'solana' WHERE "symbol" = 'LINK' AND "category" = 'defi';
UPDATE "Token" SET "contractAddress" = '0x5e794e5d3d01c045ddfb2448c4afd557ec297d1dee49b28923dc0ada3425f780', "chainSlug" = 'arc' WHERE "symbol" = 'ARC' AND "category" = 'defi';
UPDATE "Token" SET "contractAddress" = '6k7hlzfcl3h64uzijbon3wznxyj6pibmp1dzh8zffhsb', "chainSlug" = 'solana' WHERE "symbol" = 'AAVE' AND "category" = 'defi';
UPDATE "Token" SET "contractAddress" = 'b5ewjvduaauzueedwvbuxzbffgeynuqqs37tum1c4pqa', "chainSlug" = 'solana' WHERE "symbol" = 'wBTC' AND "category" = 'defi';
UPDATE "Token" SET "contractAddress" = 'hktfl7iwgkt5qhjywqkcdnzxscoh811k7akrmzjkccef', "chainSlug" = 'solana' WHERE "symbol" = 'wETH' AND "category" = 'defi';
UPDATE "Token" SET "contractAddress" = '0xa95b0f5a65a769d82ab4f3e82842e45b8bbaf101', "chainSlug" = 'arbitrum' WHERE "symbol" = 'CRV' AND "category" = 'defi';
UPDATE "Token" SET "contractAddress" = '0x3367fedd8ad5a8cf01cfe89df3c697d3a59a1cad', "chainSlug" = 'base' WHERE "symbol" = 'COMP' AND "category" = 'defi';

-- LIT (Lighter): replaces USDG in the curated defi list (see the
-- 20260918150000 migration). Insert it if prisma/seed.ts hasn't created it
-- yet on this database; update it in place if it has.
INSERT INTO "Token" ("id", "symbol", "name", "contractAddress", "chainSlug", "dex", "category", "coingeckoId", "isTracked", "createdAt")
SELECT 'seed-token-lit-defi-001', 'LIT', 'Lighter', '5h7c1wuyre3uaegnfaxlor4jnucmyncrrhfk6oavxfwt', 'solana', 'Lighter', 'defi', NULL, true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Token" WHERE "symbol" = 'LIT' AND "category" = 'defi');

UPDATE "Token" SET "contractAddress" = '5h7c1wuyre3uaegnfaxlor4jnucmyncrrhfk6oavxfwt', "chainSlug" = 'solana' WHERE "symbol" = 'LIT' AND "category" = 'defi';

-- Drop any leftover `trending` row for LIT — it's now tracked explicitly
-- under `defi` above, so the auto-discovered duplicate (Robinhood-chain
-- address, separate from the Solana address just set) would otherwise sit
-- there showing stale/duplicate data until the next trending sync run
-- catches it via the dedup logic in sync-trending-tokens.ts.
DELETE FROM "Token" WHERE "symbol" = 'LIT' AND "category" = 'trending';
