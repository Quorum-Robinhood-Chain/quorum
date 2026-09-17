import { env, requireEnv } from '@/lib/env';

const DEFAULT_BASE_URL = 'https://api.xiaomimimo.com/v1';
const DEFAULT_MODEL = 'mimo-v2.5-pro';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Load MiMo API configuration from the environment.
function getConfig() {
  return {
    apiKey: requireEnv('MIMO_API_KEY'),
    // Token Plan keys (tp-…) use a dedicated regional host — keep it configurable.
    baseUrl: env('MIMO_BASE_URL', DEFAULT_BASE_URL).replace(/\/+$/, ''),
    model: env('MIMO_MODEL', DEFAULT_MODEL),
  };
}

// Send a chat completion request to the configured MiMo model.
export async function chatCompletion(
  messages: ChatMessage[],
  options: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const { apiKey, baseUrl, model } = getConfig();

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_completion_tokens: options.maxTokens ?? 2000,
      temperature: options.temperature ?? 0.7,
      stream: false,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');

    // 401/403 indicates that the configured API credentials or endpoint may be invalid.
    const hint =
      res.status === 401 || res.status === 403
        ? ' (check MIMO_API_KEY and MIMO_BASE_URL)'
        : '';

    throw new Error(
      `MiMo request failed ${res.status}${hint}: ${detail.slice(0, 500)}`,
    );
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;

  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('MiMo returned no text content');
  }

  return text;
}

// Check whether the configured MiMo API is reachable and responding.
export async function pingMimo(): Promise<{
  ok: boolean;
  model: string;
  error?: string;
}> {
  try {
    const { model } = getConfig();

    await chatCompletion([{ role: 'user', content: 'ping' }], {
      maxTokens: 8,
    });

    return { ok: true, model };
  } catch (err) {
    return {
      ok: false,
      model: env('MIMO_MODEL', DEFAULT_MODEL),
      error: (err as Error).message,
    };
  }
}
