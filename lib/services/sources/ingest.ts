import Parser from "rss-parser";
import { prisma } from "@/lib/db/client";
import { dedupeKeyFor } from "@/lib/utils/dedupe";
import { isRobinhoodChainRelevant } from "@/lib/utils/relevance";

const USER_AGENT =
  process.env.INGEST_USER_AGENT ?? "QuorumBot/1.0 (+https://quorum.example/about)";

const parser = new Parser({
  headers: { "User-Agent": USER_AGENT },
  timeout: 15_000,
});

export interface IngestResult {
  sourceName: string;
  fetched: number;
  stored: number;
  relevant: number;
  skippedDuplicates: number;
  error?: string;
}

/**
 * Pulls an RSS feed, filters for Robinhood Chain relevance, and stores new items
 * as `raw_items` (headline + short excerpt + link only — §7.1: "not full article bodies").
 *
 * Compliance (§7.1 / §7.3): this assumes `feedUrl` is an *official* RSS feed, which is
 * the preferred path per the brief. It does not fall back to scraping — if a source has
 * no confirmed feed, `feedUrl` should be left unset and that source skipped until either
 * (a) an official feed/API is found, or (b) a scraper is built that has been checked
 * against robots.txt and ToS first (see README-backend.md "Ingestion compliance").
 */
export async function ingestFromRssFeed(sourceName: string): Promise<IngestResult> {
  const source = await prisma.source.findUnique({ where: { name: sourceName } });

  if (!source) {
    return { sourceName, fetched: 0, stored: 0, relevant: 0, skippedDuplicates: 0, error: "source not seeded in DB" };
  }
  if (!source.enabled) {
    return { sourceName, fetched: 0, stored: 0, relevant: 0, skippedDuplicates: 0, error: "source disabled" };
  }
  if (!source.feedUrl) {
    return {
      sourceName,
      fetched: 0,
      stored: 0,
      relevant: 0,
      skippedDuplicates: 0,
      error: "no feedUrl configured — confirm an official feed exists before enabling (brief §17)",
    };
  }

  let feed;
  try {
    feed = await parser.parseURL(source.feedUrl);
  } catch (err) {
    return {
      sourceName,
      fetched: 0,
      stored: 0,
      relevant: 0,
      skippedDuplicates: 0,
      error: `feed fetch failed: ${(err as Error).message}`,
    };
  }

  let stored = 0;
  let relevant = 0;
  let skippedDuplicates = 0;

  for (const item of feed.items ?? []) {
    const title = item.title?.trim();
    const url = item.link?.trim();
    if (!title || !url) continue;

    const excerpt = stripHtml(item.contentSnippet ?? item.content ?? "").slice(0, 500);
    const isRelevant = isRobinhoodChainRelevant(title, excerpt);
    if (isRelevant) relevant += 1;

    // Store every item we saw (for dedup/audit), but only relevant ones feed the generation
    // pipeline (§8.4 reads `isRelevant: true`). Non-relevant items are cheap to keep for a
    // few days and helpful for tuning the keyword filter.
    const dedupeKey = dedupeKeyFor(title, url);

    try {
      await prisma.rawItem.create({
        data: {
          sourceId: source.id,
          title,
          excerpt,
          url,
          dedupeKey,
          publishedAt: item.isoDate ? new Date(item.isoDate) : null,
          isRelevant,
        },
      });
      stored += 1;
    } catch (err) {
      // Unique constraint on url/dedupeKey — already ingested this story.
      skippedDuplicates += 1;
    }
  }

  return { sourceName, fetched: feed.items?.length ?? 0, stored, relevant, skippedDuplicates };
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
