import { createHash } from 'node:crypto';

// Stable key so the same story isn't stored twice when an excerpt changes slightly.
export function dedupeKeyFor(title: string, url: string): string {
  const normalizedTitle = title.trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizedUrl = url.trim().toLowerCase().replace(/[?#].*$/, '');
  return createHash('sha256').update(`${normalizedTitle}|${normalizedUrl}`).digest('hex');
}
