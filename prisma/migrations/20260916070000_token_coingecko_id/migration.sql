-- Adds the CoinGecko coin id so tracked tokens can be priced without on-chain config.
ALTER TABLE "Token" ADD COLUMN "coingeckoId" TEXT;
