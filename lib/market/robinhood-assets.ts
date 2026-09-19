const ASSETS_URL = 'https://api.robinhood.com/rhj/assets';
const PRICES_URL = (symbol: string) =>
  `https://api.robinhood.com/rhj/prices/${encodeURIComponent(symbol)}`;

// Robinhood Chain mainnet — see lib/market/rpc.ts / RHC_CHAIN_ID.
const ROBINHOOD_CHAIN_ID = 4663;

interface RhAssetDeployment {
  contractAddress: string;
  chainId: number;
}

interface RhAsset {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  deployments: RhAssetDeployment[];
  currentMultiplier: string;
  logoUrl: string;
  status: 'ASSET_STATUS_UNSPECIFIED' | 'ASSET_STATUS_ACTIVE' | 'ASSET_STATUS_INACTIVE';
}

export interface StockTokenAsset {
  symbol: string; // bare ticker, no "x" suffix — matches Robinhood's own convention
  name: string;
  contractAddress: string;
  logoUrl: string;
  currentMultiplier: string;
}

export async function fetchActiveStockTokenAssets(): Promise<StockTokenAsset[]> {
  const res = await fetch(ASSETS_URL, { cache: 'no-store' });

  if (!res.ok) {
    throw new Error(`Robinhood /rhj/assets HTTP ${res.status}`);
  }

  const data = (await res.json()) as { assets: RhAsset[] };

  return data.assets
    .filter((asset) => asset.status === 'ASSET_STATUS_ACTIVE')
    .map((asset) => {
      const deployment = asset.deployments.find(
        (d) => d.chainId === ROBINHOOD_CHAIN_ID,
      );

      return deployment
        ? {
            symbol: asset.tokenSymbol,
            name: asset.tokenName,
            contractAddress: deployment.contractAddress,
            logoUrl: asset.logoUrl,
            currentMultiplier: asset.currentMultiplier,
          }
        : null;
    })
    .filter((asset): asset is StockTokenAsset => asset !== null);
}

export interface StockTokenQuote {
  symbol: string;
  priceUsd: number | null;
  dailyTradingVolumeUsd: number | null;
  isTradingHalt: boolean;
  error?: string;
}

export async function fetchStockTokenQuote(
  symbol: string,
): Promise<StockTokenQuote> {
  try {
    const res = await fetch(PRICES_URL(symbol), { cache: 'no-store' });

    if (!res.ok) {
      return {
        symbol,
        priceUsd: null,
        dailyTradingVolumeUsd: null,
        isTradingHalt: false,
        error: `Robinhood /rhj/prices HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as {
      quotes: Array<{
        tokenSymbol: string;
        bid: string;
        ask: string;
        dailyTradingVolume: string;
        isTradingHalt: boolean;
      }>;
    };

    const quote = data.quotes[0];

    if (!quote) {
      return {
        symbol,
        priceUsd: null,
        dailyTradingVolumeUsd: null,
        isTradingHalt: false,
        error: 'no quote returned',
      };
    }

    const bid = Number(quote.bid);
    const ask = Number(quote.ask);
    const priceUsd =
      Number.isFinite(bid) && Number.isFinite(ask) ? (bid + ask) / 2 : null;
    const volume = Number(quote.dailyTradingVolume);

    return {
      symbol,
      priceUsd,
      dailyTradingVolumeUsd: Number.isFinite(volume) ? volume : null,
      isTradingHalt: quote.isTradingHalt,
    };
  } catch (err) {
    return {
      symbol,
      priceUsd: null,
      dailyTradingVolumeUsd: null,
      isTradingHalt: false,
      error: (err as Error).message,
    };
  }
}

export async function fetchStockTokenQuotes(
  symbols: string[],
  concurrency = 15,
): Promise<StockTokenQuote[]> {
  const results: StockTokenQuote[] = [];

  for (let i = 0; i < symbols.length; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fetchStockTokenQuote));
    results.push(...batchResults);
  }

  return results;
}
