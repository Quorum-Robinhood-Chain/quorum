import { NetworkStat } from "@/types";

// Network Snapshot stats — real metrics, no native token price/APY.
export const networkSnapshot: NetworkStat[] = [
  { label: "Total Value Locked", value: "$41.6M", trend: "up" },
  { label: "24h DEX Volume", value: "$9.2M", trend: "up" },
  { label: "DEX Volume Rank", value: "#3 among L2s", trend: "up" },
  { label: "Active Protocols", value: "14", trend: "up" },
  { label: "USDG Lending APY", value: "6.9%", trend: "up" },
  { label: "Stock Tokens Listed", value: "58", trend: "up" },
];

export const ctaStats = [
  { num: "$41.6M", label: "Total value locked" },
  { num: "14", label: "Live protocols" },
  { num: "6.9%", label: "USDG lending APY" },
  { num: "58", label: "Stock Tokens tracked" },
];
