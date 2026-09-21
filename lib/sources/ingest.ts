import Parser from 'rss-parser';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { dedupeKeyFor } from '@/lib/dedupe';
import { isRobinhoodChainRelevant } from '@/lib/relevance';

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

const stripHtml = (input: string) =>
  input
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Fetch and store RSS items from a configured source.
export async function ingestSource(
  sourceName: SourceName,
): Promise<IngestResult> {
  const source = await prisma.source.findUnique({
    where: { name: sourceName },
  });

  if (!source) {
    return emptyResult(
      sourceName,
      'source not seeded in DB — run `npm run db:seed`',
    );
  }

  if (!source.enabled) {
    return emptyResult(sourceName, 'source disabled');
  }

  if (!source.feedUrl) {
    return emptyResult(
      sourceName,
      'no feedUrl configured — confirm an official feed first',
    );
  }

  // Identify the ingestion client to the publisher.
  const parser = new Parser({
    headers: {
      'User-Agent': env(
        'INGEST_USER_AGENT',
        'QuorumBot/1.0 (+https://quorum.example/about)',
      ),
    },
    timeout: 15_000,
  });

  let feed: Awaited<ReturnType<Parser['parseURL']>>;

  try {
    feed = await parser.parseURL(source.feedUrl);
  } catch (err) {
    return emptyResult(
      sourceName,
      `feed fetch failed: ${(err as Error).message}`,
    );
  }

  let stored = 0;
  let relevant = 0;
  let skippedDuplicates = 0;

  // Process each feed item and store it for deduplication and relevance filtering.
  for (const item of feed.items ?? []) {
    const title = item.title?.trim();
    const url = item.link?.trim();

    if (!title || !url) continue;

    const excerpt = stripHtml(item.contentSnippet ?? item.content ?? '').slice(
      0,
      500,
    );
    const isRelevant = isRobinhoodChainRelevant(title, excerpt);

    if (isRelevant) relevant += 1;

    // Store all fetched items so deduplication and filtering can be tuned later.
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
      skippedDuplicates += 1;
    }
  }

  return {
    sourceName,
    fetched: feed.items?.length ?? 0,
    stored,
    relevant,
    skippedDuplicates,
  };
}

// Ingest all configured sources sequentially.
export async function ingestAllSources(): Promise<IngestResult[]> {
  const results: IngestResult[] = [];

  for (const name of SOURCE_NAMES) {
    results.push(await ingestSource(name));
  }

  return results;
}
