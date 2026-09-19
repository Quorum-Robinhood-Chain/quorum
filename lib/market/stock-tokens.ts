import { Contract } from 'ethers';
import { getProvider, hasRpcConfigured } from './rpc';
import { fetchStockTokenQuotes } from './robinhood-assets';

const ERC20_ABI = ['function decimals() view returns (uint8)'];

export interface StockTokenPrice {
  symbol: string;
  priceUsd: number | null;
  dailyTradingVolumeUsd: number | null;
  isTradingHalt: boolean;
  updatedAt: Date | null;
  error?: string;
  warning?: string;
}

async function verifyContract(
  address: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!hasRpcConfigured()) return { ok: true };

  try {
    await new Contract(address, ERC20_ABI, getProvider()).decimals();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export interface TrackedStockToken {
  symbol: string;
  contractAddress: string | null;
}

export async function fetchStockTokenPrices(
  tokens: TrackedStockToken[],
): Promise<StockTokenPrice[]> {
  const quotes = await fetchStockTokenQuotes(tokens.map((t) => t.symbol));
  const bySymbol = new Map(quotes.map((q) => [q.symbol, q]));

  return Promise.all(
    tokens.map(async (token): Promise<StockTokenPrice> => {
      const quote = bySymbol.get(token.symbol);

      if (!quote || quote.error || quote.priceUsd == null) {
        return {
          symbol: token.symbol,
          priceUsd: null,
          dailyTradingVolumeUsd: null,
          isTradingHalt: false,
          updatedAt: null,
          error: quote?.error ?? 'no quote returned',
        };
      }

      const onchain = token.contractAddress
        ? await verifyContract(token.contractAddress)
        : { ok: true };

      return {
        symbol: token.symbol,
        priceUsd: quote.priceUsd,
        dailyTradingVolumeUsd: quote.dailyTradingVolumeUsd,
        isTradingHalt: quote.isTradingHalt,
        updatedAt: new Date(),
        ...(onchain.ok
          ? {}
          : { warning: `onchain check failed — ${onchain.error}` }),
      };
    }),
  );
}
