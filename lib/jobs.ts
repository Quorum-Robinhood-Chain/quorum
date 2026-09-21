import { ingestAllSources } from '@/lib/sources/ingest';
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
  return (
    typeof value === 'string' && (JOBS as readonly string[]).includes(value)
  );
}

export async function runJob(job: JobName, forceTemplate?: TemplateType) {
  switch (job) {
    case 'ingest': {
      // RSS news feeds only (landing in raw_items). X/Twitter ingestion via Apify was
      // removed — market sentiment now comes from Dexscreener trading data instead
      // (see the `market_pulse` template in lib/llm/generate.ts).
      const rss = await ingestAllSources();
      return { rss };
    }
    case 'market':
      return refreshMarketData();
    case 'stock-tokens-sync':
      return syncStockTokens();
    case 'trending-tokens-sync':
      return syncTrendingTokens();
    case 'generate':
      return generateArticle(forceTemplate);
    case 'weekly-digest':
      return generateArticle('weekly_digest');
  }
}
