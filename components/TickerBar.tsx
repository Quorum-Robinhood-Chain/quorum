import { tickerData as fallbackTickerData } from "@/data/ticker";
import { getTickerPresentation } from "@/lib/presenters/ticker";

// Pure CSS marquee; list duplicated for a seamless loop.
// Server component: reads live snapshots straight from the DB via the shared presenter
// (no self-fetch over HTTP). Falls back to the static placeholder set — and says so —
// whenever there's no live data yet or it's gone stale (§12 NFR: never show stale data as live).
export default async function TickerBar() {
  const { items: liveItems, isStale } = await getTickerPresentation();

  const usingFallback = liveItems.length === 0;
  const items = usingFallback ? fallbackTickerData : liveItems;
  const displayItems = [...items, ...items];

  return (
    <div className="ticker-bar" role="marquee" aria-label="Robinhood Chain market data">
      {(usingFallback || isStale) && (
        <span className="ticker-status" title={usingFallback ? "Live feed not connected yet — showing placeholder values" : "Live feed hasn't refreshed recently"}>
          {usingFallback ? "SAMPLE DATA" : "DELAYED"}
        </span>
      )}
      <div className="ticker-track">
        {displayItems.map((item, i) => (
          <span className="ticker-item" key={`${item.label}-${i}`}>
            <b>{item.label}</b> {item.value}{" "}
            <span className={item.isUp ? "up" : "down"}>{item.change}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
