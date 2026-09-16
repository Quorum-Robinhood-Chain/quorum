// CoinGecko API — free tier works unauthenticated at low request volume.
// Set COINGECKO_API_KEY to use the Pro/Demo tier for higher rate limits.
// Docs: https://docs.coingecko.com/reference/simple-price

const API_KEY = process.env.COINGECKO_API_KEY;
const BASE_URL = API_KEY ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";

export interface TokenPrice {
  id: string;
  usd: number | null;
  usd24hChange: number | null;
}

/** `ids` are CoinGecko coin ids (not ticker symbols) — e.g. "morpho", "1inch". */
export async function fetchTokenPrices(ids: string[]): Promise<TokenPrice[]> {
  if (ids.length === 0) return [];

  const url = new URL(`${BASE_URL}/simple/price`);
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set("vs_currencies", "usd");
  url.searchParams.set("include_24hr_change", "true");

  const res = await fetch(url, {
    headers: API_KEY ? { "x-cg-pro-api-key": API_KEY } : undefined,
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`CoinGecko simple/price failed: ${res.status}`);

  const data: Record<string, { usd?: number; usd_24h_change?: number }> = await res.json();
  return ids.map((id) => ({
    id,
    usd: data[id]?.usd ?? null,
    usd24hChange: data[id]?.usd_24h_change ?? null,
  }));
}
