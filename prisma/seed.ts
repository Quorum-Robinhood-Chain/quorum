import { PrismaClient } from '@prisma/client';

// Seeds the reference rows the pipeline needs: news sources, tracked tokens, and the
// admin editor. Safe to re-run — everything is an upsert.
//
// X/Twitter sources are NOT seeded here on purpose — `ingestApifyPosts()`
// (lib/sources/apify-ingest.ts) upserts a Source row per handle straight from
// APIFY_MONITORED_ACCOUNTS on every ingest run, so the account list is just an env var,
// not a migration/reseed.
const prisma = new PrismaClient();

const SOURCES = [
  {
    name: 'BeInCrypto',
    url: 'https://beincrypto.com',
    feedUrl: process.env.BEINCRYPTO_FEED_URL || null,
    tosNotes: 'Confirm robots.txt + ToS before enabling (§7.1, §17).',
  },
  {
    name: 'Coinfomania',
    url: 'https://coinfomania.com',
    feedUrl: process.env.COINFOMANIA_FEED_URL || null,
    tosNotes:
      'Confirm robots.txt + ToS before enabling (§7.1, §17). Filter for Robinhood mentions.',
  },
];

// Memecoins stay in their own category so they can be labelled separately (§17).
// `coingeckoId` is the CoinGecko coin id (not the ticker) and is what makes a token
// priced out of the box. Leave it null for anything CoinGecko doesn't list — those need
// TOKEN_POOL_MAP (on-chain pool) or STOCK_TOKEN_MAP instead.
const TOKENS = [
  {
    symbol: 'AAPLx',
    name: 'Apple Stock Token',
    dex: 'Stock Token',
    category: 'stock_token',
    coingeckoId: null,
  },
  {
    symbol: 'NVDAx',
    name: 'Nvidia Stock Token',
    dex: 'Stock Token',
    category: 'stock_token',
    coingeckoId: null,
  },
  {
    symbol: 'TSLAx',
    name: 'Tesla Stock Token',
    dex: 'Stock Token',
    category: 'stock_token',
    coingeckoId: null,
  },
  {
    symbol: 'MSFTx',
    name: 'Microsoft Stock Token',
    dex: 'Stock Token',
    category: 'stock_token',
    coingeckoId: null,
  },
  {
    symbol: 'GOOGLx',
    name: 'Alphabet Stock Token',
    dex: 'Stock Token',
    category: 'stock_token',
    coingeckoId: null,
  },
  {
    symbol: 'HOODx',
    name: 'Robinhood Stock Token',
    dex: 'Stock Token',
    category: 'stock_token',
    coingeckoId: null,
  },
  {
    symbol: 'AMZNx',
    name: 'Amazon Stock Token',
    dex: 'Stock Token',
    category: 'stock_token',
    coingeckoId: null,
  },
  {
    symbol: 'METAx',
    name: 'Meta Stock Token',
    dex: 'Stock Token',
    category: 'stock_token',
    coingeckoId: null,
  },
  {
    symbol: 'COINx',
    name: 'Coinbase Stock Token',
    dex: 'Stock Token',
    category: 'stock_token',
    coingeckoId: null,
  },
  {
    symbol: 'AMDx',
    name: 'AMD Stock Token',
    dex: 'Stock Token',
    category: 'stock_token',
    coingeckoId: null,
  },
  {
    symbol: 'USDG',
    name: 'Global Dollar',
    dex: 'Morpho',
    category: 'defi',
    coingeckoId: 'global-dollar',
  },
  {
    symbol: 'UNI',
    name: 'Uniswap',
    dex: 'Uniswap',
    category: 'defi',
    coingeckoId: 'uniswap',
  },
  {
    symbol: '1INCH',
    name: '1inch',
    dex: '1inch',
    category: 'defi',
    coingeckoId: '1inch',
  },
  {
    symbol: 'MORPHO',
    name: 'Morpho',
    dex: 'Morpho',
    category: 'defi',
    coingeckoId: 'morpho',
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    dex: 'Chainlink',
    category: 'defi',
    coingeckoId: 'chainlink',
  },
  {
    symbol: 'ARC',
    name: 'Arcus',
    dex: 'Arcus',
    category: 'defi',
    coingeckoId: null,
  },
  {
    symbol: 'AAVE',
    name: 'Aave',
    dex: 'Uniswap',
    category: 'defi',
    coingeckoId: 'aave',
  },
  {
    symbol: 'wBTC',
    name: 'Wrapped Bitcoin (bridged)',
    dex: 'Uniswap',
    category: 'defi',
    coingeckoId: 'wrapped-bitcoin',
  },
  {
    symbol: 'wETH',
    name: 'Wrapped Ether (bridged)',
    dex: 'Uniswap',
    category: 'defi',
    coingeckoId: 'weth',
  },
  {
    symbol: 'CRV',
    name: 'Curve DAO Token',
    dex: 'Uniswap',
    category: 'defi',
    coingeckoId: 'curve-dao-token',
  },
  {
    symbol: 'COMP',
    name: 'Compound',
    dex: 'Uniswap',
    category: 'defi',
    coingeckoId: 'compound-governance-token',
  },
] as const;

async function main() {
  for (const source of SOURCES) {
    await prisma.source.upsert({
      where: { name: source.name },
      update: { feedUrl: source.feedUrl },
      create: { ...source, type: 'news', pollingIntervalMinutes: 20 },
    });
  }

  for (const token of TOKENS) {
    const existing = await prisma.token.findFirst({
      where: { symbol: token.symbol },
    });
    if (existing) {
      await prisma.token.update({
        where: { id: existing.id },
        data: { coingeckoId: token.coingeckoId },
      });
    } else {
      await prisma.token.create({ data: { ...token } });
    }
  }

  const username = process.env.ADMIN_USERNAME || 'admin';
  await prisma.editor.upsert({
    where: { username },
    update: {},
    create: { username, name: 'Admin', role: 'editor' },
  });

  console.log(
    `Seed complete: ${SOURCES.length} sources, ${TOKENS.length} tokens, 1 editor.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
