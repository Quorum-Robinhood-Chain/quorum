import { TokenRow } from "@/types";

// Placeholder token rows — swap for a live fetch before launch.
// Meme tokens kept in their own labeled group.
export const trendingTokens: TokenRow[] = [
  {
    id: "tok-1",
    symbol: "AAPLx",
    name: "Apple Stock Token",
    dex: "Chainlink feed",
    category: "stock_token",
    price: "$231.40",
    change24h: "+1.8%",
    isUp: true,
    volume24h: "$1.4M",
  },
  {
    id: "tok-2",
    symbol: "NVDAx",
    name: "Nvidia Stock Token",
    dex: "Chainlink feed",
    category: "stock_token",
    price: "$187.02",
    change24h: "-0.6%",
    isUp: false,
    volume24h: "$2.1M",
  },
  {
    id: "tok-3",
    symbol: "USDG",
    name: "USDG (Morpho lending)",
    dex: "Morpho",
    category: "defi",
    price: "$1.00",
    change24h: "0.0%",
    isUp: true,
    volume24h: "$3.8M",
  },
  {
    id: "tok-4",
    symbol: "ARC",
    name: "Arcus",
    dex: "Arcus",
    category: "defi",
    price: "$0.84",
    change24h: "+4.2%",
    isUp: true,
    volume24h: "$1.1M",
  },
  {
    id: "tok-5",
    symbol: "CASHCAT",
    name: "CashCat",
    dex: "Uniswap",
    category: "meme",
    price: "$0.0000041",
    change24h: "+62.3%",
    isUp: true,
    volume24h: "$980K",
  },
  {
    id: "tok-6",
    symbol: "DADDY",
    name: "Daddy Coin",
    dex: "1inch",
    category: "meme",
    price: "$0.0071",
    change24h: "-18.4%",
    isUp: false,
    volume24h: "$610K",
  },
];

export const tokenCategoryLabels: Record<string, string> = {
  stock_token: "Stock Tokens",
  defi: "DeFi",
  meme: "Memecoins",
};
