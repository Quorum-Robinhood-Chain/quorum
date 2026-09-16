// Client config for Xiaomi's MiMo API (OpenAI-compatible chat completions).
// Docs: https://mimo.mi.com/docs/en-US/api/chat/openai-api
//
// No dedicated SDK is needed — MiMo speaks the standard OpenAI chat-completions
// shape, so generate.ts calls it with a plain fetch().

export interface MimoConfig {
  apiKey: string;
  baseUrl: string;
}

let config: MimoConfig | null = null;

export function getMimoConfig(): MimoConfig {
  if (!config) {
    const apiKey = process.env.MIMO_API_KEY;
    if (!apiKey) throw new Error("MIMO_API_KEY is not set");
    const baseUrl = process.env.MIMO_BASE_URL || "https://api.xiaomimimo.com/v1";
    config = { apiKey, baseUrl };
  }
  return config;
}

export const MIMO_MODEL = process.env.MIMO_MODEL || "mimo-v2.5-pro";
