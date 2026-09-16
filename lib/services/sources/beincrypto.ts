import { ingestFromRssFeed, type IngestResult } from "./ingest";

/**
 * BeInCrypto ingestion (§7.1).
 *
 * Before enabling: check https://beincrypto.com/robots.txt and BeInCrypto's Terms of
 * Service for scraping/reuse restrictions, and confirm `BEINCRYPTO_FEED_URL` is a real,
 * currently-working feed (the value in .env.example is a best-guess WordPress path, not
 * a verified endpoint). This is dev-brief.md §17's first open question — resolve it before
 * turning this job on in the scheduler.
 */
export async function ingestBeInCrypto(): Promise<IngestResult> {
  return ingestFromRssFeed("BeInCrypto");
}
