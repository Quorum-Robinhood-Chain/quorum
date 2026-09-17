import { prisma } from '@/lib/db';
import { env, envNumber } from '@/lib/env';
import { dedupeKeyFor } from '@/lib/dedupe';
import { isMarketSignal } from '@/lib/relevance';

// Apify "run Actor synchronously and get dataset items" endpoint — runs the configured
// X/Twitter scraper Actor and waits for its dataset in one call. Docs:
// https://docs.apify.com/api/v2/act-run-sync-get-dataset-items-post
const APIFY_API_BASE = 'https://api.apify.com/v2';

export interface ApifyIngestResult {
  handles: string[];
  fetched: number;
  stored: number;
  relevant: number;
  skippedDuplicates: number;
  error?: string;
}

const emptyResult = (handles: string[], error: string): ApifyIngestResult => ({
  handles,
  fetched: 0,
  stored: 0,
  relevant: 0,
  skippedDuplicates: 0,
  error,
});

function monitoredHandles(): string[] {
  const raw = env('APIFY_MONITORED_ACCOUNTS', '');
  return raw
    .split(',')
    .map((h) => h.trim().replace(/^@/, ''))
    .filter(Boolean);
}

// Ensure a Source row exists for every configured handle, so RawItem's foreign key
// has somewhere to point without a manual seed step every time the account list changes.
async function ensureHandleSources(
  handles: string[],
): Promise<Map<string, string>> {
  const idByHandle = new Map<string, string>();

  for (const handle of handles) {
    const source = await prisma.source.upsert({
      where: { name: `X: @${handle}` },
      update: {},
      create: {
        name: `X: @${handle}`,
        url: `https://x.com/${handle}`,
        type: 'social',
        handle,
        pollingIntervalMinutes: 20,
        tosNotes:
          'Public posts only, scraped via Apify, paraphrased in generated articles and linked out — never republished verbatim (§ editorial rules).',
      },
    });

    idByHandle.set(handle.toLowerCase(), source.id);
  }

  return idByHandle;
}

// Dataset item shape returned by the `apidojo/tweet-scraper` Actor (aka "Tweet Scraper
// V2"). Other Apify tweet-scraper Actors return a similar shape; adjust the mapping
// below (and APIFY_ACTOR_ID in .env) if you swap Actors.
interface ApifyTweetItem {
  id?: string;
  text?: string;
  url?: string;
  twitterUrl?: string;
  createdAt?: string;
  isRetweet?: boolean;
  isReply?: boolean;
  author?: {
    userName?: string;
  };
}

const stripUrls = (text: string) => text.replace(/https?:\/\/\S+/g, '').trim();

// Fetch recent posts from every configured account via an Apify Actor run and store
// them as RawItems — raw material for the `social_pulse` template, never shown to
// readers as a standalone "tweet" item.
export async function ingestApifyPosts(): Promise<ApifyIngestResult> {
  const handles = monitoredHandles();
  const apiToken = env('APIFY_API_TOKEN');
  const actorId = env('APIFY_ACTOR_ID', 'apidojo/tweet-scraper');

  if (handles.length === 0) {
    return emptyResult(handles, 'no accounts configured — set APIFY_MONITORED_ACCOUNTS');
  }

  if (!apiToken) {
    return emptyResult(handles, 'APIFY_API_TOKEN not configured');
  }

  const idByHandle = await ensureHandleSources(handles);

  const maxItems = Math.min(
    Math.max(envNumber('APIFY_MAX_RESULTS_PER_CYCLE', 25), 10),
    100,
  );

  // One search term per handle, retweets and replies excluded at the query level —
  // same intent as the old X API `(from:a OR from:b) -is:reply -is:retweet` query.
  const input = {
    searchTerms: handles.map((h) => `from:${h} -filter:retweets -filter:replies`),
    maxItems,
    sort: 'Latest',
  };

  const url = new URL(
    `${APIFY_API_BASE}/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items`,
  );
  // format=json is the default, set explicitly for clarity.
  url.searchParams.set('format', 'json');

  let items: ApifyTweetItem[];

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(input),
      // Apify runs can take a while; the sync endpoint itself times out at 300s server-side.
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return emptyResult(
        handles,
        `Apify Actor run failed (${res.status}): ${body.slice(0, 200)}`,
      );
    }

    items = await res.json();
  } catch (err) {
    return emptyResult(
      handles,
      `Apify Actor run fetch failed: ${(err as Error).message}`,
    );
  }

  let stored = 0;
  let relevant = 0;
  let skippedDuplicates = 0;

  for (const item of items) {
    if (item.isRetweet || item.isReply) continue;

    const username = item.author?.userName;
    const sourceId = username ? idByHandle.get(username.toLowerCase()) : undefined;

    // Skip posts we can't attribute back to one of the configured Source rows —
    // shouldn't happen given the query is scoped to those accounts, but stay defensive.
    if (!sourceId) {
      skippedDuplicates += 1;
      continue;
    }

    const rawText = item.text ?? '';
    const cleanText = stripUrls(rawText).slice(0, 500);
    if (!cleanText) continue;

    const title = cleanText.length > 120 ? `${cleanText.slice(0, 117)}...` : cleanText;
    const postUrl = item.url ?? item.twitterUrl ?? `https://x.com/${username}/status/${item.id}`;
    const isRelevant = isMarketSignal(cleanText);

    if (isRelevant) relevant += 1;

    try {
      await prisma.rawItem.create({
        data: {
          sourceId,
          title,
          excerpt: cleanText,
          url: postUrl,
          dedupeKey: dedupeKeyFor(title, postUrl),
          publishedAt: item.createdAt ? new Date(item.createdAt) : null,
          isRelevant,
        },
      });

      stored += 1;
    } catch {
      skippedDuplicates += 1;
    }
  }

  return {
    handles,
    fetched: items.length,
    stored,
    relevant,
    skippedDuplicates,
  };
}
