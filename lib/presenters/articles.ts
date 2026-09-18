import { prisma } from '@/lib/db';
import { timeAgo, estimateReadTime } from '@/lib/format';
import { isGated, gateUnlocksAt, minutesUntilUnlock } from '@/lib/gating';
import { quorumMinBalance } from '@/lib/wallet/quorumToken';
import {
  heroArticle,
  heroSideArticles,
  latestNews,
  marketCards,
} from '@/data/articles';
import { getTokensPresentation } from '@/lib/presenters/tokens';
import { externalTokenUrl } from '@/lib/market/external-links';
import {
  ARTICLE_CATEGORIES,
  type Article,
  type ArticleCategory,
  type SourceAttribution,
  type TokenRow,
} from '@/types';

export type RelatedToken = { symbol: string; url: string };

// Articles have no DB column linking them to a token (see prisma/schema.prisma) —
// so "which token is this about" is inferred by scanning the text for a known
// symbol, e.g. "AAPL" or "USDG". Cheap, no migration needed, good enough for a
// "check this token" link. Matched against `tokens`, the app's live Token
// table (via getTokensPresentation — same live-DB-with-fallback pattern the
// /tokens page already uses), so newly added/removed tokens are picked up
// automatically without touching this file. The link itself points off-site
// (TradingView for Stock Tokens, Dexscreener via contractAddress otherwise)
// — see lib/market/external-links.ts. contractAddress is required here (not
// just symbol/category) so that link doesn't fall back to a name search that
// can resolve to a different token with the same symbol.
function matchRelatedTokens(
  text: string,
  tokens: Pick<TokenRow, 'symbol' | 'category' | 'contractAddress'>[],
): RelatedToken[] {
  const found = new Map<string, string>();

  for (const token of tokens) {
    const escaped = token.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
    if (pattern.test(text) && !found.has(token.symbol)) {
      found.set(token.symbol, externalTokenUrl(token));
    }
  }

  return Array.from(found, ([symbol, url]) => ({ symbol, url }));
}

const VALID_SOURCE_NAMES: SourceAttribution['name'][] = [
  'BeInCrypto',
  'Coinfomania',
  'Quorum',
];

// Normalize an article category and fall back to Markets when invalid.
function toArticleCategory(raw: string): ArticleCategory {
  return ARTICLE_CATEGORIES.includes(raw as ArticleCategory)
    ? (raw as ArticleCategory)
    : 'Markets';
}

// Normalize a source name and fall back to Quorum when invalid.
function toSourceName(raw: string | undefined): SourceAttribution['name'] {
  return raw && (VALID_SOURCE_NAMES as string[]).includes(raw)
    ? (raw as SourceAttribution['name'])
    : 'Quorum';
}

// Remove duplicate articles while preserving their original order.
function dedupeById(list: Article[]): Article[] {
  const seen = new Set<string>();

  return list.filter((a) => {
    if (seen.has(a.id)) return false;

    seen.add(a.id);
    return true;
  });
}

const FALLBACK_ALL: Article[] = dedupeById([
  heroArticle,
  ...heroSideArticles,
  ...marketCards,
  ...latestNews,
]);

export interface ArticlesPresentation {
  articles: Article[];
  usingLiveData: boolean;
}

// Fetch published articles and fall back to sample data when live data is unavailable.
export async function getArticlesPresentation(
  opts: {
    category?: ArticleCategory;
    limit?: number;
  } = {},
): Promise<ArticlesPresentation> {
  const limit = opts.limit ?? 20;

  try {
    const rows = await prisma.article.findMany({
      where: {
        status: 'published',
        ...(opts.category ? { category: opts.category } : {}),
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });

    if (rows.length === 0) {
      return {
        articles: fallbackSlice(opts.category, limit),
        usingLiveData: false,
      };
    }

    const articles: Article[] = rows.map((a: any) => ({
      id: a.id,
      category: toArticleCategory(a.category),
      headline: a.headline,
      dek: a.dek ?? '',
      desk: a.automated
        ? 'Quorum Automated Desk'
        : (a.sourceNames[0] ?? 'Quorum'),
      timeAgo: timeAgo(a.publishedAt ?? a.generatedAt),
      readTime: estimateReadTime(a.dek || a.headline),
      automated: a.automated,
      source: {
        name: toSourceName(a.sourceNames[0]),
        url: a.sourceUrls[0] ?? '#',
      },
      href: `/news/${a.id}`,
      gated: isGated(a.publishedAt ?? a.generatedAt),
    }));

    return {
      articles,
      usingLiveData: true,
    };
  } catch {
    return {
      articles: fallbackSlice(opts.category, limit),
      usingLiveData: false,
    };
  }
}

// Return fallback articles filtered by category and limited to the requested count.
function fallbackSlice(
  category: ArticleCategory | undefined,
  limit: number,
): Article[] {
  const pool = category
    ? FALLBACK_ALL.filter((a) => a.category === category)
    : FALLBACK_ALL;

  return pool.slice(0, limit);
}

export interface HeroPresentation {
  hero: Article;
  side: Article[];
  usingLiveData: boolean;
}

// Fetch the latest articles and prepare the homepage hero layout.
export async function getHeroPresentation(): Promise<HeroPresentation> {
  // Ambil 8 artikel terbaru:
  // 1 artikel untuk Hero utama
  // 7 artikel untuk "Next on the network"
  const { articles, usingLiveData } = await getArticlesPresentation({
    limit: 7,
  });

  // Jika database tidak memiliki artikel live,
  // gunakan artikel fallback.
  if (!usingLiveData || articles.length === 0) {
    return {
      hero: heroArticle,

      // Maksimal 7 artikel di sisi kanan.
      // Nomornya nanti otomatis menjadi 02 sampai 08
      // di component Hero.tsx.
      side: heroSideArticles.slice(0, 7),

      usingLiveData: false,
    };
  }

  // Artikel pertama menjadi berita utama.
  // Sisanya menjadi berita di sisi kanan.
  const [hero, ...side] = articles;

  return {
    hero,
    side,
    usingLiveData: true,
  };
}

export interface ArticleDetail {
  id: string;
  category: ArticleCategory;
  headline: string;
  dek: string;

  /** Empty string while gated — the body is deliberately withheld server-side,
   *  never shipped to the client and hidden behind a wallet check client-side. */
  body: string;

  desk: string;
  timeAgo: string;
  automated: boolean;
  sourceNames: string[];
  sourceUrls: string[];
  gated: boolean;
  unlocksAt: string | null;
  minutesUntilUnlock: number;
  requiredBalance: number;

  /** Tokens mentioned in the headline/dek/body, each with a trusted off-site
   *  link (TradingView for Stock Tokens, Dexscreener by contract address
   *  otherwise). Inferred from
   *  text — see matchRelatedTokens — not a stored relation. */
  relatedTokens: RelatedToken[];
}

// Fetch a published article by ID and return its presentation data.
// The body is withheld while the article is still inside the gate window.
export async function getArticleById(
  id: string,
): Promise<ArticleDetail | null> {
  try {
    const a = await prisma.article.findUnique({
      where: { id },
    });

    if (!a || a.status !== 'published') {
      return null;
    }

    const publishedAt = a.publishedAt ?? a.generatedAt;
    const gated = isGated(publishedAt);
    // Live tokens (DB, falls back to data/tokens.ts internally) — same set
    // shown on /tokens, so a detected mention always leads somewhere real.
    const { tokens } = await getTokensPresentation();

    return {
      id: a.id,
      category: toArticleCategory(a.category),
      headline: a.headline,
      dek: a.dek ?? '',
      body: gated ? '' : a.body,
      desk: a.automated
        ? 'Quorum Automated Desk'
        : (a.sourceNames[0] ?? 'Quorum'),
      timeAgo: timeAgo(publishedAt),
      automated: a.automated,
      sourceNames: a.sourceNames,
      sourceUrls: a.sourceUrls,
      gated,
      unlocksAt: gated ? gateUnlocksAt(publishedAt).toISOString() : null,
      minutesUntilUnlock: gated ? minutesUntilUnlock(publishedAt) : 0,
      requiredBalance: quorumMinBalance(),
      // Body is withheld while gated, so this only sees headline + dek until unlock.
      relatedTokens: matchRelatedTokens(
        `${a.headline} ${a.dek ?? ''} ${gated ? '' : a.body}`,
        tokens,
      ),
    };
  } catch {
    return null;
  }
}

export type GatedBodyResult =
  | {
      ok: true;
      body: string;
    }
  | {
      ok: false;
      error:
        | 'not_found'
        | 'no_address'
        | 'insufficient_balance'
        | 'gate_not_configured'
        | 'rpc_error';
      detail?: string;
      balance?: number;
      required?: number;
    };

// Re-checks the gate server-side and returns the real article body only if
// the address holds enough $QUORUM or the article has aged out of the gate
// window on its own.
export async function getGatedArticleBody(
  id: string,
  address: string | null,
): Promise<GatedBodyResult> {
  const a = await prisma.article.findUnique({
    where: { id },
  });

  if (!a || a.status !== 'published') {
    return {
      ok: false,
      error: 'not_found',
    };
  }

  const publishedAt = a.publishedAt ?? a.generatedAt;

  if (!isGated(publishedAt)) {
    return {
      ok: true,
      body: a.body,
    };
  }

  if (!address) {
    return {
      ok: false,
      error: 'no_address',
    };
  }

  const { checkQuorumBalance } = await import('@/lib/wallet/quorumToken');

  const result = await checkQuorumBalance(address);

  if (!result.ok) {
    if (result.reason === 'not_configured') {
      return {
        ok: false,
        error: 'gate_not_configured',
        required: result.required,
      };
    }

    if (result.reason === 'rpc_error') {
      return {
        ok: false,
        error: 'rpc_error',
        detail: result.detail,
        required: result.required,
      };
    }

    return {
      ok: false,
      error: 'insufficient_balance',
      required: result.required,
    };
  }

  return {
    ok: true,
    body: a.body,
  };
}
