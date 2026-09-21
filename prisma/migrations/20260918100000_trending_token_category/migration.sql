-- Add `trending` to TokenCategory — tokens auto-discovered on Robinhood Chain
-- via Blockscout (see lib/market/sync-trending-tokens.ts), as opposed to
-- stock_token (Robinhood's own catalog) or defi/meme (hand-configured pools).
ALTER TYPE "TokenCategory" ADD VALUE 'trending';
