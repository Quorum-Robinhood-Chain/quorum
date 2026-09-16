import { prisma } from '@/lib/db';
import { chatCompletion } from './client';
import { SYSTEM_PROMPT, TEMPLATE_INSTRUCTIONS, TEMPLATE_LABELS, type TemplateType } from './prompts';
import { fetchNewPairsSince } from '@/lib/market/chain-rpc';

// Hourly rotation (brief §6.2). `weekly_digest` runs on its own lower-frequency schedule.
const HOURLY_TEMPLATES: TemplateType[] = [
  'trending_dex_tokens',
  'new_token_launches',
  'ecosystem_roundup',
  'stock_token_movers',
  'tvl_lending_snapshot',
];

interface GatheredData {
  verifiedData: Record<string, unknown>;
  generationInputs: string[]; // audit trail (§12)
  sourceNames: string[];
  sourceUrls: string[];
  rawItemIds: string[];
  hasEnoughData: boolean;
}

interface SnapshotRow {
  scope: string;
  metric: string;
  value: number;
  source: string;
}

/** Latest snapshot per (scope, metric) under a scope prefix — same "current value" rule as the ticker. */
async function latestSnapshots(scopePrefix: string): Promise<SnapshotRow[]> {
  const rows = await prisma.marketSnapshot.findMany({
    where: { scope: { startsWith: scopePrefix } },
    orderBy: { timestamp: 'desc' },
    take: 200,
  });

  const seen = new Set<string>();
  return rows.filter((row: SnapshotRow) => {
    const key = `${row.scope}:${row.metric}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const describeSnapshot = (s: SnapshotRow) =>
  `${s.source}:${s.scope}:${s.metric} = ${s.value}`;

const uniqueSources = (rows: SnapshotRow[]): string[] => [...new Set(rows.map((r) => r.source))];

async function gatherData(template: TemplateType): Promise<GatheredData> {
  switch (template) {
    case 'trending_dex_tokens': {
      const snapshots = await latestSnapshots('token:');
      return {
        verifiedData: {
          tokens: snapshots.map((s) => ({ scope: s.scope, metric: s.metric, value: s.value, source: s.source })),
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
          (p) => `chain-rpc:new-pair dex=${p.dex} pair=${p.pairAddress} block=${p.blockNumber}`,
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
          headlines: items.map((i) => ({ title: i.title, excerpt: i.excerpt, source: i.source.name, url: i.url })),
          protocolTvl: tvl.map((s) => ({ scope: s.scope, metric: s.metric, value: s.value })),
        },
        generationInputs: [
          ...items.map((i) => `${i.source.name}:headline+excerpt, fetched ${i.fetchedAt.toISOString()}`),
          ...tvl.map(describeSnapshot),
        ],
        sourceNames: [...new Set(items.map((i) => i.source.name))],
        sourceUrls: items.map((i) => i.url),
        rawItemIds: items.map((i) => i.id),
        hasEnoughData: items.length > 0 || tvl.length > 0,
      };
    }

    case 'stock_token_movers': {
      const stockTokens = await prisma.token.findMany({ where: { category: 'stock_token', isTracked: true } });
      const scopes = stockTokens.map((t) => `token:${t.symbol}`);
      const snapshots = scopes.length
        ? await prisma.marketSnapshot.findMany({
            where: { scope: { in: scopes }, metric: 'price' },
            orderBy: { timestamp: 'desc' },
            take: 50,
          })
        : [];

      return {
        verifiedData: { stockTokens: snapshots.map((s) => ({ scope: s.scope, metric: s.metric, value: s.value })) },
        generationInputs: snapshots.map(describeSnapshot),
        sourceNames: uniqueSources(snapshots),
        sourceUrls: [],
        rawItemIds: [],
        hasEnoughData: snapshots.length >= 2,
      };
    }

    case 'tvl_lending_snapshot': {
      const morpho = await latestSnapshots('protocol:morpho');
      const chain = (await latestSnapshots('chain')).filter((s) => s.metric === 'tvl');

      return {
        verifiedData: {
          morpho: morpho.map((s) => ({ metric: s.metric, value: s.value })),
          chainTvl: chain.map((s) => ({ metric: s.metric, value: s.value })),
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
        where: { status: 'published', publishedAt: { gte: since } },
        orderBy: { publishedAt: 'desc' },
        take: 20,
      });

      return {
        verifiedData: { recentHeadlines: articles.map((a) => ({ headline: a.headline, category: a.category })) },
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

/** The model is told to return raw JSON; fences are stripped defensively. */
function parseModelJson(text: string): GeneratedArticle {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed?.headline || !parsed?.body) throw new Error('model output missing headline/body');
  return parsed;
}

export type GenerateResult =
  | { skipped: true; template: TemplateType; reason: string }
  | { skipped: false; template: TemplateType; articleId: string; headline: string };

/**
 * Runs one generation cycle (§8.4): pick a template, gather only verified DB data, call MiMo,
 * store the result as a draft with its full audit trail.
 *
 * Returns `skipped` and writes nothing when there isn't enough verified data — per §6.1 a
 * missing number is never approximated. That's the expected outcome for the first few cycles.
 */
export async function generateArticle(forceTemplate?: TemplateType): Promise<GenerateResult> {
  const template = forceTemplate ?? HOURLY_TEMPLATES[Math.floor(Math.random() * HOURLY_TEMPLATES.length)];
  const data = await gatherData(template);

  if (!data.hasEnoughData) {
    return { skipped: true, template, reason: 'insufficient verified data for this cycle' };
  }

  const userMessage = [
    `TEMPLATE: ${TEMPLATE_LABELS[template]}`,
    TEMPLATE_INSTRUCTIONS[template],
    '',
    'VERIFIED DATA (the only source of any number you may state):',
    JSON.stringify(data.verifiedData, null, 2),
  ].join('\n');

  const raw = await chatCompletion([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]);

  const generated = parseModelJson(raw);

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
      status: 'draft', // human review gate (§8.5)
    },
  });

  if (data.rawItemIds.length > 0) {
    await prisma.rawItem.updateMany({
      where: { id: { in: data.rawItemIds } },
      data: { usedInArticle: true },
    });
  }

  return { skipped: false, template, articleId: article.id, headline: article.headline };
}
