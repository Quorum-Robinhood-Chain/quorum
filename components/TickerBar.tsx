import { tickerData } from "@/data/ticker";

// Pure CSS marquee; list duplicated for a seamless loop.
export default function TickerBar() {
  const items = [...tickerData, ...tickerData];

  return (
    <div className="ticker-bar" role="marquee" aria-label="Robinhood Chain market data">
      <div className="ticker-track">
        {items.map((item, i) => (
          <span className="ticker-item" key={`${item.label}-${i}`}>
            <b>{item.label}</b> {item.value}{" "}
            <span className={item.isUp ? "up" : "down"}>{item.change}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
