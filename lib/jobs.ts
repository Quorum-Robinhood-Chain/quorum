import { ingestAllSources } from '@/lib/sources/ingest';
import { refreshMarketData } from '@/lib/market/refresh';
import { generateArticle } from '@/lib/llm/generate';
import type { TemplateType } from '@/lib/llm/prompts';

// Every scheduled job in one place, so the cron route and the admin button share it.
export const JOBS = ['ingest', 'market', 'generate', 'weekly-digest'] as const;
export type JobName = (typeof JOBS)[number];

export function isJobName(value: unknown): value is JobName {
  return typeof value === 'string' && (JOBS as readonly string[]).includes(value);
}

export async function runJob(job: JobName, forceTemplate?: TemplateType) {
  switch (job) {
    case 'ingest':
      return ingestAllSources();
    case 'market':
      return refreshMarketData();
    case 'generate':
      return generateArticle(forceTemplate);
    case 'weekly-digest':
      return generateArticle('weekly_digest');
  }
}
