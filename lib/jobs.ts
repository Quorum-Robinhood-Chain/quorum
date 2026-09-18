import { ingestAllSources } from '@/lib/sources/ingest';
import { ingestApifyPosts } from '@/lib/sources/apify-ingest';
import { refreshMarketData } from '@/lib/market/refresh';
import { syncStockTokens } from '@/lib/market/sync-stock-tokens';
import { syncTrendingTokens } from '@/lib/market/sync-trending-tokens';
import { generateArticle } from '@/lib/llm/generate';
import type { TemplateType } from '@/lib/llm/prompts';

// Every scheduled job in one place, so the cron route and the admin button share it.
export const JOBS = [
  'ingest',
  'market',
  'stock-tokens-sync',
  'trending-tokens-sync',
  'generate',
  'weekly-digest',
] as const;
export type JobName = (typeof JOBS)[number];

export function isJobName(value: unknown): value is JobName {
  return typeof value === 'string' && (JOBS as readonly string[]).includes(value);
}

export async function runJob(job: JobName, forceTemplate?: TemplateType) {
  switch (job) {
    case 'ingest': {
      // RSS sites and monitored X accounts (scraped via Apify) on the same 20-min
      // cadence, both landing in raw_items — X posts are just tagged with a `social`
      // Source (§ apify-ingest.ts).
      const [rss, x] = await Promise.all([ingestAllSources(), ingestApifyPosts()]);
      return { rss, x };
    }
    case 'market':
      return refreshMarketData();
    case 'stock-tokens-sync':
      // Full catalog sync + top-10-by-volume ranking — see lib/market/sync-stock-tokens.ts
      // for why this runs on its own (slower) schedule instead of every 5-minute tick.
      return syncStockTokens();
    case 'trending-tokens-sync':
      // Auto-discover whatever's actually trading on Robinhood Chain right now via
      // Dexscreener — see lib/market/sync-trending-tokens.ts. No key required;
      // returns `skipped` (not a failure) if Dexscreener has no candidates for
      // this chain on a given run.
      return syncTrendingTokens();
    case 'generate':
      return generateArticle(forceTemplate);
    case 'weekly-digest':
      return generateArticle('weekly_digest');
  }
}
