import { prisma } from '@/lib/db';
import { chatCompletion } from './client';
import {
  SYSTEM_PROMPT,
  TEMPLATE_INSTRUCTIONS,
  TEMPLATE_LABELS,
  type TemplateType,
} from './prompts';
import { fetchNewPairsSince } from '@/lib/market/chain-rpc';

// Rotated every generation cycle (every 30 minutes by default — see vercel.json).
// `stock_token_movers` intentionally left out — no more stock-token stories.
const GENERATION_TEMPLATES: TemplateType[] = [
  'trending_dex_tokens',
  'new_token_launches',
  'ecosystem_roundup',
  'social_pulse',
  'tvl_lending_snapshot',
];

// Generation runs 4x/hour. Topic choice stays fully random/free — this only
// guarantees a floor: out of every 4 consecutive articles, at least 1 must
// be X-sourced (`social_pulse`). Checked by looking at the last 3 articles;
// if none of them was `social_pulse`, this cycle is forced to be, so no
// rolling window of 4 can ever end up with zero X-sourced articles.
const X_QUOTA_WINDOW = 3; // look back this many articles (current one makes 4)

// How far back a social_pulse cycle is allowed to reach for *reused* posts
// (already used in a previous article) once there isn't enough fresh data.
const SOCIAL_PULSE_REUSE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

interface GatheredData {
  verifiedData: Record<string, unknown>;
  generationInputs: string[];
  sourceNames: string[];
  sourceUrls: string[];
  rawItemIds: string[];
  hasEnoughData: boolean;
  // True only for social_pulse when fresh (unused) posts weren't enough and
  // the cycle fell back to posts already used in an earlier article. Tells
  // generateArticle() to swap the "developing story" framing for a
  // "still the topic of conversation" one instead.
  isReusedData?: boolean;
}

interface SnapshotRow {
  scope: string;
  metric: string;
  value: number;
  source: string;
}

// Fetch the latest snapshot for each scope and metric combination.
//
// DISTINCT ON (scope, metric), not a row-capped findMany — a `take: 200`
// cap counts total rows scanned across every scope under this prefix, not
// rows per scope. With 190+ Stock Tokens alone writing price + volume_24h
// every 5-minute tick, `token:` easily produces 200+ rows in a single
// cycle, which can push a `trending` token's snapshot out of the window
// before the LLM ever sees it — the same failure mode as
// lib/presenters/tokens.ts's getTokensPresentation(). DISTINCT ON always
// returns the freshest row per (scope, metric), regardless of how many
// scopes exist under the prefix.
async function latestSnapshots(scopePrefix: string): Promise<SnapshotRow[]> {
  const escaped = scopePrefix.replace(/[%_]/g, (c) => `\\${c}`);

  return prisma.$queryRaw<SnapshotRow[]>`
    SELECT DISTINCT ON (scope, metric) scope, metric, value, source
    FROM "MarketSnapshot"
    WHERE scope LIKE ${escaped + '%'}
    ORDER BY scope, metric, timestamp DESC
  `;
}

const describeSnapshot = (s: SnapshotRow) =>
  `${s.source}:${s.scope}:${s.metric} = ${s.value}`;

const uniqueSources = (rows: SnapshotRow[]): string[] => [
  ...new Set(rows.map((r) => r.source)),
];

// Gather verified data required by the selected article template.
async function gatherData(template: TemplateType): Promise<GatheredData> {
  switch (template) {
    case 'trending_dex_tokens': {
      const allSnapshots = await latestSnapshots('token:');

      // The scope alone (`token:SYMBOL`) doesn't say which category a token
      // belongs to — look categories up by symbol so stock_token/meme rows
      // can be filtered out entirely (no more stories touching those) and
      // so "trending" (Dexscreener-discovered) tokens can be called out.
      const allSymbols = [
        ...new Set(allSnapshots.map((s) => s.scope.replace(/^token:/, ''))),
      ];
      const allTokenRows = allSymbols.length
        ? await prisma.token.findMany({
            where: { symbol: { in: allSymbols } },
            select: { symbol: true, category: true },
          })
        : [];
      const categoryBySymbol = new Map(
        allTokenRows.map((t) => [t.symbol, t.category]),
      );

      const EXCLUDED_CATEGORIES = new Set(['stock_token', 'meme']);
      const snapshots = allSnapshots.filter((s) => {
        const category = categoryBySymbol.get(s.scope.replace(/^token:/, ''));
        return category == null || !EXCLUDED_CATEGORIES.has(category);
      });

      return {
        verifiedData: {
          tokens: snapshots.map((s) => ({
            scope: s.scope,
            metric: s.metric,
            value: s.value,
            source: s.source,
            category:
              categoryBySymbol.get(s.scope.replace(/^token:/, '')) ?? null,
          })),
        },
        generationInputs: snapshots.map(describeSnapshot),
        sourceNames: uniqueSources(snapshots),
        sourceUrls: [],
        rawItemIds: [],
        hasEnoughData: snapshots.length >= 2,
      };
    }

    case 'new_token_launches': {
      const pairs = await fetchNewPairsSince();

      return {
        verifiedData: { newPairs: pairs },
        generationInputs: pairs.map(
          (p) =>
            `chain-rpc:new-pair dex=${p.dex} pair=${p.pairAddress} block=${p.blockNumber}`,
        ),
        sourceNames: ['Chain RPC'],
        sourceUrls: [],
        rawItemIds: [],
        hasEnoughData: pairs.length > 0,
      };
    }

    case 'ecosystem_roundup': {
      // Headline + excerpt only — never full article bodies (§7.1).
      const items = await prisma.rawItem.findMany({
        where: { isRelevant: true, usedInArticle: false },
        orderBy: { fetchedAt: 'desc' },
        take: 8,
        include: { source: true },
      });

      const tvl = await latestSnapshots('protocol:');

      return {
        verifiedData: {
          headlines: items.map((i) => ({
            title: i.title,
            excerpt: i.excerpt,
            source: i.source.name,
            url: i.url,
          })),
          protocolTvl: tvl.map((s) => ({
            scope: s.scope,
            metric: s.metric,
            value: s.value,
          })),
        },
        generationInputs: [
          ...items.map(
            (i) =>
              `${i.source.name}:headline+excerpt, fetched ${i.fetchedAt.toISOString()}`,
          ),
          ...tvl.map(describeSnapshot),
        ],
        sourceNames: [...new Set(items.map((i) => i.source.name))],
        sourceUrls: items.map((i) => i.url),
        rawItemIds: items.map((i) => i.id),
        hasEnoughData: items.length > 0 || tvl.length > 0,
      };
    }

    case 'social_pulse': {
      // Raw material only — these never appear to readers as their own "tweet" item,
      // only synthesized into an original story (§6.1 rule 1, §16 template instructions).
      const MIN_POSTS = 3; // need a genuine "pulse" (multiple accounts/posts),
      // not a single tweet dressed up as a trend.

      const freshPosts = await prisma.rawItem.findMany({
        where: {
          isRelevant: true,
          usedInArticle: false,
          source: { type: 'social' },
        },
        orderBy: { fetchedAt: 'desc' },
        take: 12,
        include: { source: true },
      });

      let posts = freshPosts;
      let isReusedData = false;

      // Not enough fresh (never-used) posts — fall back to posts already
      // used in an earlier article, as long as they're still within the
      // reuse window. Still real posts, still attributed — just not new.
      if (freshPosts.length < MIN_POSTS) {
        const reusedPosts = await prisma.rawItem.findMany({
          where: {
            isRelevant: true,
            source: { type: 'social' },
            fetchedAt: {
              gte: new Date(Date.now() - SOCIAL_PULSE_REUSE_WINDOW_MS),
            },
          },
          orderBy: { fetchedAt: 'desc' },
          take: 12,
          include: { source: true },
        });

        if (reusedPosts.length >= MIN_POSTS) {
          posts = reusedPosts;
          isReusedData = true;
        }
      }

      return {
        verifiedData: {
          posts: posts.map((p) => ({
            handle: p.source.handle,
            text: p.excerpt,
            postedAt: p.publishedAt,
            url: p.url,
          })),
        },
        generationInputs: posts.map((p) => `x:@${p.source.handle}:${p.url}`),
        sourceNames: [...new Set(posts.map((p) => `X: @${p.source.handle}`))],
        sourceUrls: posts.map((p) => p.url),
        // Only mark fresh posts as used — reused posts stay eligible for reuse
        // again later, and re-marking them wouldn't change anything anyway.
        rawItemIds: isReusedData ? [] : posts.map((p) => p.id),
        hasEnoughData: posts.length >= MIN_POSTS,
        isReusedData,
      };
    }

    case 'stock_token_movers': {
      const stockTokens = await prisma.token.findMany({
        where: { category: 'stock_token', isTracked: true },
      });

      const scopes = stockTokens.map((t) => `token:${t.symbol}`);

      const snapshots = scopes.length
        ? await prisma.marketSnapshot.findMany({
            where: { scope: { in: scopes }, metric: 'price' },
            orderBy: { timestamp: 'desc' },
            take: 50,
          })
        : [];

      return {
        verifiedData: {
          stockTokens: snapshots.map((s) => ({
            scope: s.scope,
            metric: s.metric,
            value: s.value,
          })),
        },
        generationInputs: snapshots.map(describeSnapshot),
        sourceNames: uniqueSources(snapshots),
        sourceUrls: [],
        rawItemIds: [],
        hasEnoughData: snapshots.length >= 2,
      };
    }

    case 'tvl_lending_snapshot': {
      const morpho = await latestSnapshots('protocol:morpho');
      const chain = (await latestSnapshots('chain')).filter(
        (s) => s.metric === 'tvl',
      );

      return {
        verifiedData: {
          morpho: morpho.map((s) => ({
            metric: s.metric,
            value: s.value,
          })),
          chainTvl: chain.map((s) => ({
            metric: s.metric,
            value: s.value,
          })),
        },
        generationInputs: [...morpho, ...chain].map(describeSnapshot),
        sourceNames: uniqueSources([...morpho, ...chain]),
        sourceUrls: [],
        rawItemIds: [],
        hasEnoughData: morpho.length > 0,
      };
    }

    case 'weekly_digest': {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const articles = await prisma.article.findMany({
        where: {
          status: 'published',
          publishedAt: { gte: since },
        },
        orderBy: { publishedAt: 'desc' },
        take: 20,
      });

      return {
        verifiedData: {
          recentHeadlines: articles.map((a) => ({
            headline: a.headline,
            category: a.category,
          })),
        },
        generationInputs: articles.map((a) => `article:${a.id}:${a.headline}`),
        sourceNames: ['Quorum'],
        sourceUrls: [],
        rawItemIds: [],
        hasEnoughData: articles.length >= 3,
      };
    }
  }
}

interface GeneratedArticle {
  headline: string;
  dek: string;
  body: string;
  category: string;
}

// Parse and validate the JSON returned by the language model.
function parseModelJson(text: string): GeneratedArticle {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  const parsed = JSON.parse(cleaned);

  if (!parsed?.headline || !parsed?.body) {
    throw new Error('model output missing headline/body');
  }

  return parsed;
}

export type GenerateResult =
  | { skipped: true; template: TemplateType; reason: string }
  | {
      skipped: false;
      template: TemplateType;
      articleId: string;
      headline: string;
      flagged: boolean;
    };

// Cheap, deterministic quality signals checked *after* generation. None of
// these block publishing — the site is auto-publish by design, so the story
// is already live for gated ($QUORUM holders) or public readers by the time
// this runs. They only set `flagged`, which surfaces the draft at the top of
// the admin queue for a fast look, with an emergency unpublish one click away.
function autoFlagReason(
  generated: GeneratedArticle,
  data: GatheredData,
): string | null {
  if (data.generationInputs.length < 2) {
    return 'low data coverage — fewer than 2 verified inputs';
  }
  if (generated.body.trim().length < 200) {
    return 'unusually short body';
  }
  if (!generated.dek || generated.dek.trim().length === 0) {
    return 'missing dek';
  }
  return null;
}

// Enforce the X-sourced floor: if none of the last X_QUOTA_WINDOW articles
// was `social_pulse`, force this cycle to be `social_pulse` regardless of
// the random pick. Otherwise the random pick stands untouched.
async function applyXQuota(candidate: TemplateType): Promise<TemplateType> {
  const recent = await prisma.article.findMany({
    orderBy: { publishedAt: 'desc' },
    take: X_QUOTA_WINDOW,
    select: { templateType: true },
  });

  const xQuotaMet = recent.some(
    (a) => a.templateType === TEMPLATE_LABELS.social_pulse,
  );

  return xQuotaMet ? candidate : 'social_pulse';
}

// Generate an automated draft from verified data and the selected template.
export async function generateArticle(
  forceTemplate?: TemplateType,
): Promise<GenerateResult> {
  const randomPick =
    forceTemplate ??
    GENERATION_TEMPLATES[
      Math.floor(Math.random() * GENERATION_TEMPLATES.length)
    ];

  const template = forceTemplate
    ? forceTemplate
    : await applyXQuota(randomPick);

  const data = await gatherData(template);

  if (!data.hasEnoughData) {
    return {
      skipped: true,
      template,
      reason: 'insufficient verified data for this cycle',
    };
  }

  const userMessage = [
    `TEMPLATE: ${TEMPLATE_LABELS[template]}`,
    TEMPLATE_INSTRUCTIONS[template],
    ...(data.isReusedData
      ? [
          '',
          'DATA FRESHNESS NOTE: every post below was already used in an earlier ' +
            'article — nothing new came in this cycle. Do NOT frame this as a ' +
            'developing story: no "BREAKING", no "JUST IN", no "right now" urgency. ' +
            'Frame it instead as sentiment that is still the topic of conversation ' +
            '(e.g. "still buzzing about...", "the conversation continues around..."). ' +
            'The facts and attribution rules still apply as normal.',
        ]
      : []),
    '',
    'VERIFIED DATA (the only source of any number you may state):',
    JSON.stringify(data.verifiedData, null, 2),
  ].join('\n');

  const raw = await chatCompletion([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]);

  const generated = parseModelJson(raw);
  const flagReason = autoFlagReason(generated, data);

  // Auto-publish: the draft goes live immediately, gated by wallet + $QUORUM
  // balance for the first hour (see lib/gating.ts). No manual approval step.
  const now = new Date();
  const article = await prisma.article.create({
    data: {
      templateType: TEMPLATE_LABELS[template],
      category: generated.category || 'Markets',
      headline: generated.headline,
      dek: generated.dek,
      body: generated.body,
      automated: true,
      sourceNames: data.sourceNames,
      sourceUrls: data.sourceUrls,
      generationInputs: data.generationInputs,
      status: 'published',
      publishedAt: now,
      flagged: flagReason !== null,
      flagReason,
    },
  });

  if (data.rawItemIds.length > 0) {
    await prisma.rawItem.updateMany({
      where: { id: { in: data.rawItemIds } },
      data: { usedInArticle: true },
    });
  }

  return {
    skipped: false,
    template,
    articleId: article.id,
    headline: article.headline,
    flagged: article.flagged,
  };
}
