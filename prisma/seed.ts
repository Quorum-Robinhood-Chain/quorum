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
// TOKEN_POOL_MAP (on-chain pool) instead.
//
// Stock Tokens are NOT seeded here on purpose (unlike defi/meme below). They come from
// Robinhood's own live catalog, not a hardcoded guess — run
// `npx tsx scripts/run-job.ts stock-tokens-sync` after seeding (or wait for its daily
// cron run) to populate them. See
// lib/market/sync-stock-tokens.ts for why: Robinhood has 190+ active Stock Tokens as of
// Sept 2026 and adds more regularly, so a static list here would go stale immediately.
// contractAddress/chainSlug below are the real deployment for each token —
// mostly NOT on Robinhood Chain (these are well-established multi-chain
// tokens; wBTC/wETH/AAVE/LINK's liquid markets happen to be on Solana here,
// for instance). chainSlug records which Dexscreener chain each address
// actually belongs to, so the external link goes to a real, resolvable pair
// instead of guessing "robinhood" for everything — see
// lib/market/external-links.ts. Supplied by the site owner, 2026-09-18.
const TOKENS = [
  {
    symbol: 'UNI',
    name: 'Uniswap',
    dex: 'Uniswap',
    category: 'defi',
    coingeckoId: 'uniswap',
    contractAddress: '0xfaa318479b7755b2dbfdd34dc306cb28b420ad12',
    chainSlug: 'ethereum',
  },
  {
    symbol: '1INCH',
    name: '1inch',
    dex: '1inch',
    category: 'defi',
    coingeckoId: '1inch',
    contractAddress: '0xfbee12f66d7aecb32bcd60efae0c49a19855a57f',
    chainSlug: 'robinhood',
  },
  {
    symbol: 'MORPHO',
    name: 'Morpho',
    dex: 'Morpho',
    category: 'defi',
    coingeckoId: 'morpho',
    contractAddress: '0xb5f0b4ae66c14f7efaa9aa1468e8fc536a3e288c',
    chainSlug: 'base',
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    dex: 'Chainlink',
    category: 'defi',
    coingeckoId: 'chainlink',
    contractAddress: '7ge3sev8rbgz7gcfddiqy6arfdnvzbkvpl9svsq9dytq',
    chainSlug: 'solana',
  },
  {
    symbol: 'ARC',
    name: 'Arcus',
    dex: 'Arcus',
    category: 'defi',
    coingeckoId: null,
    contractAddress:
      '0x5e794e5d3d01c045ddfb2448c4afd557ec297d1dee49b28923dc0ada3425f780',
    chainSlug: 'arc',
  },
  {
    symbol: 'AAVE',
    name: 'Aave',
    dex: 'Uniswap',
    category: 'defi',
    coingeckoId: 'aave',
    contractAddress: '6k7hlzfcl3h64uzijbon3wznxyj6pibmp1dzh8zffhsb',
    chainSlug: 'solana',
  },
  {
    symbol: 'wBTC',
    name: 'Wrapped Bitcoin (bridged)',
    dex: 'Uniswap',
    category: 'defi',
    coingeckoId: 'wrapped-bitcoin',
    contractAddress: 'b5ewjvduaauzueedwvbuxzbffgeynuqqs37tum1c4pqa',
    chainSlug: 'solana',
  },
  {
    symbol: 'wETH',
    name: 'Wrapped Ether (bridged)',
    dex: 'Uniswap',
    category: 'defi',
    coingeckoId: 'weth',
    contractAddress: 'hktfl7iwgkt5qhjywqkcdnzxscoh811k7akrmzjkccef',
    chainSlug: 'solana',
  },
  {
    symbol: 'CRV',
    name: 'Curve DAO Token',
    dex: 'Uniswap',
    category: 'defi',
    coingeckoId: 'curve-dao-token',
    contractAddress: '0xa95b0f5a65a769d82ab4f3e82842e45b8bbaf101',
    chainSlug: 'arbitrum',
  },
  {
    symbol: 'COMP',
    name: 'Compound',
    dex: 'Uniswap',
    category: 'defi',
    coingeckoId: 'compound-governance-token',
    contractAddress: '0x3367fedd8ad5a8cf01cfe89df3c697d3a59a1cad',
    chainSlug: 'base',
  },
  // LIT (Lighter) replaces USDG here — USDG is Robinhood Chain's own
  // settlement stablecoin, not a third-party DeFi protocol token, and kept
  // showing up duplicated between the `defi` and auto-discovered `trending`
  // lists. Lighter is one of Robinhood Chain's actual launch DeFi
  // integrations (perps trading, plus its own points → $LIT incentive
  // programme), so it's a like-for-like replacement rather than an
  // arbitrary filler.
  {
    symbol: 'LIT',
    name: 'Lighter',
    dex: 'Lighter',
    category: 'defi',
    coingeckoId: null,
    contractAddress: '5h7c1wuyre3uaegnfaxlor4jnucmyncrrhfk6oavxfwt',
    chainSlug: 'solana',
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
      // Was: only coingeckoId. That silently skipped every other field on
      // an already-seeded row, so re-running this script (e.g. after adding
      // contractAddress/chainSlug for the defi tokens) never actually wrote
      // them for tokens that already existed in the DB.
      await prisma.token.update({
        where: { id: existing.id },
        data: {
          name: token.name,
          dex: token.dex,
          contractAddress: token.contractAddress,
          chainSlug: token.chainSlug,
          coingeckoId: token.coingeckoId,
        },
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
