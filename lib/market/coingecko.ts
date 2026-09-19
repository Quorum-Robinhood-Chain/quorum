import { env, envFlag } from '@/lib/env';

export interface TokenPrice {
  id: string;
  usd: number | null;
  usd24hChange: number | null;
}

// Fetch current USD prices and 24-hour changes from CoinGecko.
export async function fetchTokenPrices(
  rawIds: string[],
): Promise<TokenPrice[]> {
  const ids = rawIds.map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) return [];

  const apiKey = env('COINGECKO_API_KEY');

  const isPro = envFlag('COINGECKO_KEY_TIER_PRO');
  const baseUrl =
    apiKey && isPro
      ? 'https://pro-api.coingecko.com/api/v3'
      : 'https://api.coingecko.com/api/v3';

  const url = new URL(`${baseUrl}/simple/price`);
  url.searchParams.set('ids', ids.join(','));
  url.searchParams.set('vs_currencies', 'usd');
  url.searchParams.set('include_24hr_change', 'true');

  const res = await fetch(url, {
    headers: apiKey
      ? { [isPro ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key']: apiKey }
      : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `CoinGecko simple/price failed: ${res.status} — ids=[${ids.join(',')}] body=${body.slice(0, 300)}`,
    );
  }

  const data: Record<string, { usd?: number; usd_24h_change?: number }> =
    await res.json();

  return ids.map((id) => ({
    id,
    usd: data[id]?.usd ?? null,
    usd24hChange: data[id]?.usd_24h_change ?? null,
  }));
}
