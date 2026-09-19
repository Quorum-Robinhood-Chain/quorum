import type { RelatedToken } from '@/lib/presenters/articles';

// Pills linking to the external market page for each token mentioned.
// Holder-only while an article is gated — callers must not render this
// (or pass data) until the gate is open.
export function RelatedTokens({ tokens }: { tokens: RelatedToken[] }) {
  if (tokens.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-400">Tokens in this story:</span>
      {tokens.map((token) => (
        <a
          key={token.symbol}
          href={token.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-olive hover:bg-panel"
        >
          {token.symbol} →
        </a>
      ))}
    </div>
  );
}

// "via Source A, Source B" attribution line with links.
export function ArticleSources({
  names,
  urls,
}: {
  names: string[];
  urls: string[];
}) {
  if (names.length === 0) return null;

  return (
    <span className="flex flex-wrap items-center gap-1">
      via{' '}
      {names.map((name, i) => (
        <span key={`${name}-${i}`} className="flex items-center gap-1">
          {urls[i] ? (
            <a
              href={urls[i]}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-600"
            >
              {name}
            </a>
          ) : (
            name
          )}
          {i < names.length - 1 && ','}
        </span>
      ))}
    </span>
  );
}
