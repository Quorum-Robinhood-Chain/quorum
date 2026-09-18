-- Remove USDG entirely (both places it was showing up): Robinhood Chain's
-- own settlement stablecoin, not a third-party DeFi protocol — it kept
-- appearing duplicated between the curated `defi` list (prisma/seed.ts) and
-- the auto-discovered `trending` list. prisma/seed.ts no longer seeds it,
-- but seeding only creates/updates, never deletes, so any existing USDG row
-- (in either category) needs a one-time cleanup here regardless of which
-- category it landed in.
DELETE FROM "Token" WHERE "symbol" = 'USDG';
