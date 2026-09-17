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
  // Drop blank/whitespace-only ids — a single "" in the comma-joined list
  // (e.g. from a Token row with coingeckoId set to "" instead of null)
  // makes CoinGecko reject the *entire* batch with 400, silently killing
  // every other token's price along with it.
  const ids = rawIds.map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) return [];

  const apiKey = env('COINGECKO_API_KEY');
  // CoinGecko has two separate hosts/headers depending on key tier:
  //  - Demo key (free, dashboard-issued, looks like "CG-...")  -> api.coingecko.com + x-cg-demo-api-key
  //  - Pro key (paid subscription)                              -> pro-api.coingecko.com + x-cg-pro-api-key
  // A Demo key sent to pro-api.coingecko.com is rejected outright, which was
  // silently killing every CoinGecko-sourced token price. Set
  // COINGECKO_KEY_TIER="pro" in .env once you're actually on a paid plan.
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
    // Surface CoinGecko's own error body (it names the invalid id/param) instead
    // of just the status code — that's the only way to tell which token's
    // coingeckoId is bad versus a rate-limit or auth problem.
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
