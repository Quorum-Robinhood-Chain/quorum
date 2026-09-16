/**
 * Single place where every environment variable is read.
 *
 * Why this file exists (the "token tidak terbaca" fix):
 *  1. Values are read LAZILY, on each call. Reading `process.env.X` at module top level
 *     gets evaluated during `next build`, so on Vercel a variable added after the build
 *     — or only present at runtime — came back `undefined`.
 *  2. Values are sanitised. A `.env` saved with Windows line endings leaves a trailing
 *     `\r` (and sometimes stray quotes) glued to the value, which silently breaks an
 *     `Authorization` header and makes a perfectly valid API key look invalid.
 *  3. Secrets shared between the Edge middleware and Node route handlers are `required()`,
 *     so a missing value fails loudly instead of falling back to a different default on
 *     each runtime (which produced session tokens that never verified).
 */

/** Trim whitespace/CR and strip quotes that some .env editors leave in the value. */
function clean(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;
  const value = raw.trim().replace(/^["']|["']$/g, '').trim();
  return value.length > 0 ? value : undefined;
}

/** Optional variable — returns `fallback` (or undefined) when unset. */
export function env(key: string): string | undefined;
export function env(key: string, fallback: string): string;
export function env(key: string, fallback?: string) {
  return clean(process.env[key]) ?? fallback;
}

/** Required variable — throws a named error instead of failing somewhere downstream. */
export function requireEnv(key: string): string {
  const value = clean(process.env[key]);
  if (!value) {
    throw new Error(
      `Missing environment variable: ${key}. Set it locally in .env and in your Vercel project settings, then redeploy.`,
    );
  }
  return value;
}

/** Number variable with a fallback (ignores non-numeric values). */
export function envNumber(key: string, fallback: number): number {
  const value = Number(clean(process.env[key]));
  return Number.isFinite(value) ? value : fallback;
}

/** Boolean variable — only the literal string "true" enables a flag. */
export function envFlag(key: string): boolean {
  return clean(process.env[key])?.toLowerCase() === 'true';
}

/** JSON-map variable (e.g. TOKEN_POOL_MAP) — returns `{}` on missing/invalid JSON. */
export function envJson<T>(key: string): Record<string, T> {
  const raw = clean(process.env[key]);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export const isProduction = () => process.env.NODE_ENV === 'production';
