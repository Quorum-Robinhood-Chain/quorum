import { prisma } from '@/lib/db/client';
import { getMimoConfig, MIMO_MODEL } from './mimo';
import {
  SYSTEM_PROMPT,
  TEMPLATE_INSTRUCTIONS,
  TEMPLATE_LABELS,
  type TemplateType,
} from './prompts';
import { fetchNewPairsSince } from '@/lib/services/market/chainRpc';

const ALL_TEMPLATES: TemplateType[] = [
  'trending_dex_tokens',
  'new_token_launches',
  'ecosystem_roundup',
  'stock_token_movers',
  'tvl_lending_snapshot',
];

interface GatheredData {
  verifiedData: Record<string, unknown>;
  generationInputs: string[];
  sourceNames: string[];
  sourceUrls: string[];
  rawItemIds: string[];
  hasEnoughData: boolean;
}

/** Reads the latest snapshot per (scope, metric) pair — mirrors how the ticker API reads "current" values. */
async function latestSnapshotsByScope(scopePrefix: string) {
  const rows = await prisma.marketSnapshot.findMany({
    where: { scope: { startsWith: scopePrefix } },
    orderBy: { timestamp: 'desc' },
    take: 200,
  });
  const seen = new Set<string>();
  const latest = [];
  for (const row of rows) {
    const key = `${row.scope}:${row.metric}`;
    if (seen.has(key)) continue;
    seen.add(key);
    latest.push(row);
  }
  return latest;
}

async function gatherDataForTemplate(
  template: TemplateType,
): Promise<GatheredData> {
  switch (template) {
    case 'trending_dex_tokens': {
      const snapshots = await latestSnapshotsByScope('token:');
      return {
        verifiedData: {
          tokens: snapshots.map((s) => ({
            scope: s.scope,
            metric: s.metric,
            value: s.value,
            source: s.source,
          })),
        },
        generationInputs: snapshots.map(
          (s) =>
            `${s.source}:${s.scope}:${s.metric} = ${s.value}${s.unit ? ` ${s.unit}` : ''}`,
        ),
        sourceNames: [...new Set(snapshots.map((s) => s.source))],
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
      const items = await prisma.rawItem.findMany({
        where: { isRelevant: true, usedInArticle: false },
        orderBy: { fetchedAt: 'desc' },
        take: 8,
        include: { source: true },
      });
      const tvlSnapshots = await latestSnapshotsByScope('protocol:');
      return {
        verifiedData: {
          headlines: items.map((i: any) => ({
            title: i.title,
            excerpt: i.excerpt,
            source: i.source.name,
            url: i.url,
          })),
          protocolTvl: tvlSnapshots.map((s: any) => ({
            scope: s.scope,
            metric: s.metric,
            value: s.value,
          })),
        },
        generationInputs: [
          ...items.map(
            (i: any) =>
              `${i.source.name}:headline+excerpt, fetched ${i.fetchedAt.toISOString()}`,
          ),
          ...tvlSnapshots.map(
            (s: any) => `${s.source}:${s.scope}:${s.metric} = ${s.value}`,
          ),
        ],
        sourceNames: [
          ...new Set(items.map((i: any) => i.source.name as string)),
        ] as string[],
        sourceUrls: items.map((i: any) => i.url as string),
        rawItemIds: items.map((i: any) => i.id as string),
        hasEnoughData: items.length > 0 || tvlSnapshots.length > 0,
      };
    }

    case 'stock_token_movers': {
      const stockTokens = await prisma.token.findMany({
        where: { category: 'stock_token', isTracked: true },
      });
      const scopes = stockTokens.map((t: any) => `token:${t.symbol}`);
      const snapshots = scopes.length
        ? await prisma.marketSnapshot.findMany({
            where: { scope: { in: scopes }, metric: 'price' },
            orderBy: { timestamp: 'desc' },
            take: 50,
          })
        : [];
      return {
        verifiedData: {
          stockTokens: snapshots.map((s: any) => ({
            scope: s.scope,
            metric: s.metric,
            value: s.value,
          })),
        },
        generationInputs: snapshots.map(
          (s: any) => `${s.source}:${s.scope}:${s.metric} = ${s.value}`,
        ),
        sourceNames: [
          ...new Set(snapshots.map((s: any) => s.source as string)),
        ] as string[],
        sourceUrls: [],
        rawItemIds: [],
        hasEnoughData: snapshots.length >= 2,
      };
    }

    case 'tvl_lending_snapshot': {
      const snapshots = await latestSnapshotsByScope('protocol:morpho');
      const chainTvl = await latestSnapshotsByScope('chain');
      return {
        verifiedData: {
          morpho: snapshots.map((s: any) => ({
            metric: s.metric,
            value: s.value,
          })),
          chainTvl: chainTvl.filter((s: any) => s.metric === 'tvl'),
        },
        generationInputs: [...snapshots, ...chainTvl].map(
          (s: any) => `${s.source}:${s.scope}:${s.metric} = ${s.value}`,
        ),
        sourceNames: [
          ...new Set(
            [...snapshots, ...chainTvl].map((s: any) => s.source as string),
          ),
        ] as string[],
        sourceUrls: [],
        rawItemIds: [],
        hasEnoughData: snapshots.length > 0,
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
        verifiedData: {
          recentHeadlines: articles.map((a: any) => ({
            headline: a.headline,
            category: a.category,
          })),
        },
        generationInputs: articles.map(
          (a: any) => `article:${a.id}:${a.headline}`,
        ),
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

function parseModelJson(text: string): GeneratedArticle {
  // Model is instructed to return raw JSON; strip fences defensively in case it doesn't.
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed.headline || !parsed.body)
    throw new Error('model output missing required fields');
  return parsed;
}

/**
 * Runs the hourly generation job for one template (§8.4). Picks a template from the rotation
 * (or uses `forceTemplate`, e.g. for a manual trigger), gathers only verified DB data, calls
 * Claude, and stores the result as a draft article with a full audit trail.
 *
 * Returns null (and writes nothing) if there isn't enough verified data for that template yet
 * — per §6.1 rule 5, we never approximate a missing number, and per rule 2 nothing gets published
 * on inferred data. This is the correct outcome the first few cycles after launch, before enough
 * ingestion/market history has accumulated.
 */
export async function generateArticle(forceTemplate?: TemplateType) {
  const template =
    forceTemplate ??
    ALL_TEMPLATES[Math.floor(Math.random() * ALL_TEMPLATES.length)];
  const data = await gatherDataForTemplate(template);

  if (!data.hasEnoughData) {
    return {
      skipped: true as const,
      template,
      reason: 'insufficient verified data for this cycle',
    };
  }

  const userMessage = [
    `TEMPLATE: ${TEMPLATE_LABELS[template]}`,
    TEMPLATE_INSTRUCTIONS[template],
    '',
    'VERIFIED DATA (the only source of any number you may state):',
    JSON.stringify(data.verifiedData, null, 2),
  ].join('\n');

  const { apiKey, baseUrl } = getMimoConfig();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      model: MIMO_MODEL,
      max_completion_tokens: 1200,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Mimo API request failed (${res.status}): ${errBody}`);
  }

  const response = await res.json();
  const text = response?.choices?.[0]?.message?.content;
  if (!text || typeof text !== 'string') {
    throw new Error('model returned no text content');
  }

  const generated = parseModelJson(text);

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
      status: 'draft',
    },
  });

  if (data.rawItemIds.length > 0) {
    await prisma.rawItem.updateMany({
      where: { id: { in: data.rawItemIds } },
      data: { usedInArticle: true },
    });
  }

  return { skipped: false as const, template, article };
}
