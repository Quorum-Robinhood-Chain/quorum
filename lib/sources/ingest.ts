import Parser from 'rss-parser';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { dedupeKeyFor } from '@/lib/dedupe';
import { isRobinhoodChainRelevant } from '@/lib/relevance';

/**
 * Source ingestion (§7.1). Stores headline + short excerpt + link only — never full
 * article bodies — and only from an official RSS feed. There is deliberately no scraper
 * fallback: if a source has no confirmed feed, leave `feedUrl` unset and it is skipped
 * until robots.txt and ToS have been checked (brief §17, open question 1).
 */

export const SOURCE_NAMES = ['BeInCrypto', 'Coinfomania'] as const;
export type SourceName = (typeof SOURCE_NAMES)[number];

export interface IngestResult {
  sourceName: string;
  fetched: number;
  stored: number;
  relevant: number;
  skippedDuplicates: number;
  error?: string;
}

const emptyResult = (sourceName: string, error: string): IngestResult => ({
  sourceName,
  fetched: 0,
  stored: 0,
  relevant: 0,
  skippedDuplicates: 0,
  error,
});

const stripHtml = (input: string) => input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export async function ingestSource(sourceName: SourceName): Promise<IngestResult> {
  const source = await prisma.source.findUnique({ where: { name: sourceName } });

  if (!source) return emptyResult(sourceName, 'source not seeded in DB — run `npm run db:seed`');
  if (!source.enabled) return emptyResult(sourceName, 'source disabled');
  if (!source.feedUrl) return emptyResult(sourceName, 'no feedUrl configured — confirm an official feed first');

  // Descriptive User-Agent so the publisher can identify and contact us (§7.1).
  const parser = new Parser({
    headers: { 'User-Agent': env('INGEST_USER_AGENT', 'QuorumBot/1.0 (+https://quorum.example/about)') },
    timeout: 15_000,
  });

  let feed: Awaited<ReturnType<Parser['parseURL']>>;
  try {
    feed = await parser.parseURL(source.feedUrl);
  } catch (err) {
    return emptyResult(sourceName, `feed fetch failed: ${(err as Error).message}`);
  }

  let stored = 0;
  let relevant = 0;
  let skippedDuplicates = 0;

  for (const item of feed.items ?? []) {
    const title = item.title?.trim();
    const url = item.link?.trim();
    if (!title || !url) continue;

    const excerpt = stripHtml(item.contentSnippet ?? item.content ?? '').slice(0, 500);
    const isRelevant = isRobinhoodChainRelevant(title, excerpt);
    if (isRelevant) relevant += 1;

    // Everything seen is stored for dedup/filter tuning; only relevant rows feed §8.4.
    try {
      await prisma.rawItem.create({
        data: {
          sourceId: source.id,
          title,
          excerpt,
          url,
          dedupeKey: dedupeKeyFor(title, url),
          publishedAt: item.isoDate ? new Date(item.isoDate) : null,
          isRelevant,
        },
      });
      stored += 1;
    } catch {
      skippedDuplicates += 1; // unique constraint on url/dedupeKey
    }
  }

  return { sourceName, fetched: feed.items?.length ?? 0, stored, relevant, skippedDuplicates };
}

/** Runs every enabled source in sequence. */
export async function ingestAllSources(): Promise<IngestResult[]> {
  const results: IngestResult[] = [];
  for (const name of SOURCE_NAMES) results.push(await ingestSource(name));
  return results;
}
