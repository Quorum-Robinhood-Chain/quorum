import { TickerItem } from "@/types";

// Placeholder ticker data — wire to live APIs before launch.
export const tickerData: TickerItem[] = [
  { label: "Robinhood Chain TVL", value: "$41.6M", change: "+3.9%", isUp: true },
  { label: "24h DEX Volume", value: "$9.2M", change: "+8.2%", isUp: true },
  { label: "USDG Lending APY", value: "6.9%", change: "+0.2%", isUp: true },
  { label: "Active Protocols", value: "14", change: "+2", isUp: true },
  { label: "New Tokens (24h)", value: "31", change: "+6", isUp: true },
  { label: "Avg Gas Fee", value: "$0.004", change: "-6.1%", isUp: false },
  { label: "DEX Volume Rank", value: "#3", change: "▲1", isUp: true },
  { label: "Stock Tokens Listed", value: "58", change: "+3", isUp: true },
];
