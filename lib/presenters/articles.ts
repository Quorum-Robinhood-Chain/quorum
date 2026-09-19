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

function matchRelatedTokens(
  text: string,
  tokens: Pick<
    TokenRow,
    'symbol' | 'category' | 'contractAddress' | 'chainSlug'
  >[],
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
    /** Max articles to return. Pass null for no cap (all published articles). */
    limit?: number | null;
    /** Only include articles published (or generated, if unpublished-dated) within the last N hours. */
    sinceHours?: number;
  } = {},
): Promise<ArticlesPresentation> {
  // When sinceHours is set and no explicit limit is given, don't cap the
  // count — the caller wants "everything from the last N hours".
  const limit =
    opts.limit === null
      ? undefined
      : (opts.limit ?? (opts.sinceHours ? undefined : 20));

  const since = opts.sinceHours
    ? new Date(Date.now() - opts.sinceHours * 60 * 60 * 1000)
    : undefined;

  try {
    const rows = await prisma.article.findMany({
      where: {
        status: 'published',
        ...(opts.category ? { category: opts.category } : {}),
        // publishedAt drives display/sort; some rows have it null and rely
        // on generatedAt instead, so check both when windowing by time.
        ...(since
          ? {
              OR: [
                { publishedAt: { gte: since } },
                {
                  AND: [{ publishedAt: null }, { generatedAt: { gte: since } }],
                },
              ],
            }
          : {}),
      },
      orderBy: { publishedAt: 'desc' },
      ...(limit ? { take: limit } : {}),
    });

    if (rows.length === 0) {
      // With a time window, an empty result is a real "nothing published
      // in the last N hours" — don't mask it with unrelated sample data.
      return {
        articles: since ? [] : fallbackSlice(opts.category, limit),
        usingLiveData: Boolean(since),
      };
    }

    const articles: Article[] = rows.map((a: any) => {
      const gated = isGated(a.publishedAt ?? a.generatedAt);

      return {
        id: a.id,
        category: toArticleCategory(a.category),
        headline: a.headline,
        dek: a.dek ?? '',
        // While gated, the original source is withheld (name AND link), so the
        // paywall can't be bypassed by clicking through. 'Quorum' is hidden by
        // the card components, so no "via …" is rendered.
        desk:
          a.automated || gated
            ? 'Quorum Automated Desk'
            : (a.sourceNames[0] ?? 'Quorum'),
        timeAgo: timeAgo(a.publishedAt ?? a.generatedAt),
        readTime: estimateReadTime(a.dek || a.headline),
        automated: a.automated,
        source: gated
          ? { name: 'Quorum' as const, url: '#' }
          : {
              name: toSourceName(a.sourceNames[0]),
              url: a.sourceUrls[0] ?? '#',
            },
        href: `/news/${a.id}`,
        gated,
      };
    });

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
  limit: number | undefined,
): Article[] {
  const pool = category
    ? FALLBACK_ALL.filter((a) => a.category === category)
    : FALLBACK_ALL;

  return limit ? pool.slice(0, limit) : pool;
}

export interface HeroPresentation {
  hero: Article;
  side: Article[];
  usingLiveData: boolean;
}

// Fetch the latest articles and prepare the homepage hero layout.
export async function getHeroPresentation(): Promise<HeroPresentation> {
  const { articles, usingLiveData } = await getArticlesPresentation({
    limit: 7,
  });

  if (!usingLiveData || articles.length === 0) {
    return {
      hero: heroArticle,

      side: heroSideArticles.slice(0, 7),

      usingLiveData: false,
    };
  }

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
  /** Empty while gated — sources are withheld server-side, same as the body. */
  sourceNames: string[];
  sourceUrls: string[];
  gated: boolean;
  unlocksAt: string | null;
  minutesUntilUnlock: number;
  requiredBalance: number;

  /** Empty while gated — the external market links are a paid perk too. */
  relatedTokens: RelatedToken[];
}

/** The parts of an article that are only revealed to holders (or after the gate window). */
export type ArticleRestricted = {
  body: string;
  sourceNames: string[];
  sourceUrls: string[];
  relatedTokens: RelatedToken[];
};

// Build the holder-only fields of an article (full body + sources + token links).
function buildRestricted(
  a: any,
  tokens: Pick<
    TokenRow,
    'symbol' | 'category' | 'contractAddress' | 'chainSlug'
  >[],
): ArticleRestricted {
  return {
    body: a.body,
    sourceNames: a.sourceNames,
    sourceUrls: a.sourceUrls,
    relatedTokens: matchRelatedTokens(
      `${a.headline} ${a.dek ?? ''} ${a.body}`,
      tokens,
    ),
  };
}

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

    // While gated, everything sensitive is withheld here on the server:
    // body, sources (names + links) and external market links. Nothing
    // reaches the HTML / API payload unless the gate check passes.
    const restricted: ArticleRestricted = gated
      ? { body: '', sourceNames: [], sourceUrls: [], relatedTokens: [] }
      : buildRestricted(a, tokens);

    return {
      id: a.id,
      category: toArticleCategory(a.category),
      headline: a.headline,
      dek: a.dek ?? '',
      desk: a.automated
        ? 'Quorum Automated Desk'
        : gated
          ? 'Quorum'
          : (a.sourceNames[0] ?? 'Quorum'),
      timeAgo: timeAgo(publishedAt),
      automated: a.automated,
      gated,
      unlocksAt: gated ? gateUnlocksAt(publishedAt).toISOString() : null,
      minutesUntilUnlock: gated ? minutesUntilUnlock(publishedAt) : 0,
      requiredBalance: quorumMinBalance(),
      ...restricted,
    };
  } catch {
    return null;
  }
}

export type GatedBodyResult =
  | ({
      ok: true;
    } & ArticleRestricted)
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
    return { ok: true, ...(await restrictedFor(a)) };
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

  return { ok: true, ...(await restrictedFor(a)) };
}

async function restrictedFor(a: any): Promise<ArticleRestricted> {
  const { tokens } = await getTokensPresentation();
  return buildRestricted(a, tokens);
}
