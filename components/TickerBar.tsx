import { tickerData as fallbackTickerData } from '@/data/ticker';
import { trendingTokens as fallbackTokens } from '@/data/tokens';
import { getTickerPresentation } from '@/lib/presenters/ticker';
import type { TickerItem } from '@/types';

// Configure ticker repetition and animation speed.
const MIN_ITEMS_PER_GROUP = 14;
const SECONDS_PER_ITEM = 3.2;
const MIN_DURATION_S = 36;

/** Sample tokens used when live ticker data is unavailable. */
const fallbackTokenTicker: TickerItem[] = fallbackTokens
  .slice(0, 6)
  .map((token) => ({
    label: token.symbol,
    value: token.price,
    change: token.change24h === '—' ? '' : token.change24h,
    isUp: token.isUp,
  }));

export default async function TickerBar() {
  // Fetch the latest ticker data and live status.
  const { items: liveItems, isStale } = await getTickerPresentation();

  const usingFallback = liveItems.length === 0;
  const items = usingFallback
    ? [...fallbackTickerData, ...fallbackTokenTicker]
    : liveItems;

  // Repeat items to keep the ticker filled across the viewport.
  const repeats = Math.max(2, Math.ceil(MIN_ITEMS_PER_GROUP / items.length));
  const group: TickerItem[] = Array.from({ length: repeats }).flatMap(
    () => items,
  );

  // Calculate the marquee duration based on the number of items.
  const durationS = Math.max(
    MIN_DURATION_S,
    Math.round(group.length * SECONDS_PER_ITEM),
  );

  // Render one ticker group for the seamless marquee loop.
  const renderGroup = (groupKey: string, ariaHidden: boolean) => (
    <div className="ticker-group" aria-hidden={ariaHidden || undefined}>
      {group.map((item, i) => (
        <span className="ticker-item" key={`${groupKey}-${item.label}-${i}`}>
          <b>{item.label}</b> {item.value}
          {item.change && (
            <span className={item.isUp ? 'up' : 'down'}>{item.change}</span>
          )}
        </span>
      ))}
    </div>
  );

  return (
    <div
      className="ticker-bar"
      role="marquee"
      aria-label="Robinhood Chain market data"
    >
      {/* Display live data status when using fallback or stale data */}
      {(usingFallback || isStale) && (
        <span
          className="ticker-status"
          title={
            usingFallback
              ? 'Live feed not connected yet — showing placeholder values'
              : "Live feed hasn't refreshed recently"
          }
        >
          {usingFallback ? 'SAMPLE DATA' : 'DELAYED'}
        </span>
      )}

      {/* Seamless scrolling ticker */}
      <div className="ticker-viewport">
        <div
          className="ticker-track"
          style={{ animationDuration: `${durationS}s` }}
        >
          {renderGroup('a', false)}
          {renderGroup('b', true)}
        </div>
      </div>
    </div>
  );
}
