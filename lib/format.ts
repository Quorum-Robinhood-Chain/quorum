// Display formatters shared by every presenter.
export function formatUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (abs < 0.01 && value !== 0) return `$${value.toFixed(7)}`;
  return `$${value.toFixed(2)}`;
}

export function formatPct(
  value: number,
  opts: { signed?: boolean } = {},
): string {
  const sign = opts.signed !== false && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'moments ago';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// Shorten a checksummed wallet address for display, e.g. 0x1234…abCD.
export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

// Rough read time from the dek — there's no dedicated column for it. */
export function estimateReadTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 40))} min read`;
}

// Split a stored article/guide body into clean paragraphs for rendering. Bodies are
// meant to use a blank line between paragraphs, but this stays defensive: it also
// accepts single-newline breaks, collapses stray whitespace inside a paragraph, and
// — if a body ever arrives as one unbroken block with no line breaks at all (e.g. a
// model output that skipped the blank-line instruction) — falls back to grouping
// sentences so it still reads as multiple paragraphs instead of one wall of text.
export function paragraphs(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const hasBlankLineBreaks = /\n\s*\n/.test(normalized);
  const blocks = (
    hasBlankLineBreaks ? normalized.split(/\n\s*\n/) : normalized.split(/\n+/)
  )
    .map((p) => p.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean);

  if (blocks.length > 1) return blocks;

  // No paragraph breaks at all — group sentences ~3 at a time as a fallback.
  const sentences = normalized.match(/[^.!?]+[.!?]+(?:\s+|$)/g) ?? [normalized];
  const grouped: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    grouped.push(
      sentences
        .slice(i, i + 3)
        .join('')
        .trim(),
    );
  }
  return grouped.filter(Boolean);
}
