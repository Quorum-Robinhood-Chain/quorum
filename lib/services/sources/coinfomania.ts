import { ingestFromRssFeed, type IngestResult } from "./ingest";

/**
 * Coinfomania ingestion (§7.1), filtered for "Robinhood" mentions via the shared
 * relevance filter (lib/utils/relevance.ts).
 *
 * Same compliance caveat as BeInCrypto: confirm robots.txt/ToS and that
 * `COINFOMANIA_FEED_URL` is a real feed before enabling in the scheduler.
 */
export async function ingestCoinfomania(): Promise<IngestResult> {
  return ingestFromRssFeed("Coinfomania");
}
