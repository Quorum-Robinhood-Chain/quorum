import { Article } from "@/types";
import { marketCards } from "@/data/articles";
import { networkSnapshot } from "@/data/stats";

// Headline strip for the full Markets page.
export const marketStats = networkSnapshot;

// Extra market items for /markets beyond the homepage's 3-card grid.
const moreMarketArticles: Article[] = [
  {
    id: "mkt-4",
    category: "Stock Tokens",
    headline: "Tech-linked Stock Tokens lead gains as trading volume climbs into the close",
    dek: "AAPLx and NVDAx saw the heaviest Chainlink-fed volume of the session, tracking their underlying equities closely.",
    desk: "Markets Desk",
    timeAgo: "4 hours ago",
    readTime: "3 min read",
    automated: true,
    source: { name: "Quorum", url: "#" },
    href: "#",
  },
  {
    id: "mkt-5",
    category: "Markets",
    headline: "DEX volume rank holds at #3 among L2s for a second straight day",
    dek: "DefiLlama's rankings show Robinhood Chain fending off two challengers as liquidity keeps arriving.",
    desk: "Markets Desk",
    timeAgo: "6 hours ago",
    readTime: "3 min read",
    automated: true,
    source: { name: "Quorum", url: "#" },
    href: "#",
  },
  {
    id: "mkt-6",
    category: "Tokens",
    headline: "Memecoin volume cools slightly after a volatile 48 hours",
    dek: "CASHCAT and DADDY remain the most-traded pairs on Uniswap and 1inch, though swings have narrowed since the weekend spike.",
    desk: "via Coinfomania",
    timeAgo: "8 hours ago",
    readTime: "3 min read",
    automated: false,
    source: { name: "Coinfomania", url: "https://coinfomania.com" },
    href: "#",
  },
];

export const marketArticles: Article[] = [...marketCards, ...moreMarketArticles];
