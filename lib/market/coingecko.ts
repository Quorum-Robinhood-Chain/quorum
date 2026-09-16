import { env } from '@/lib/env';

// CoinGecko — free tier works unauthenticated at low volume; a key raises rate limits.
// Docs: https://docs.coingecko.com/reference/simple-price

export interface TokenPrice {
  id: string;
  usd: number | null;
  usd24hChange: number | null;
}

/** `ids` are CoinGecko coin ids (not tickers) — e.g. "morpho", "1inch". */
export async function fetchTokenPrices(ids: string[]): Promise<TokenPrice[]> {
  if (ids.length === 0) return [];

  const apiKey = env('COINGECKO_API_KEY');
  const baseUrl = apiKey ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3';

  const url = new URL(`${baseUrl}/simple/price`);
  url.searchParams.set('ids', ids.join(','));
  url.searchParams.set('vs_currencies', 'usd');
  url.searchParams.set('include_24hr_change', 'true');

  const res = await fetch(url, {
    headers: apiKey ? { 'x-cg-pro-api-key': apiKey } : undefined,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`CoinGecko simple/price failed: ${res.status}`);

  const data: Record<string, { usd?: number; usd_24h_change?: number }> = await res.json();
  return ids.map((id) => ({
    id,
    usd: data[id]?.usd ?? null,
    usd24hChange: data[id]?.usd_24h_change ?? null,
  }));
}
