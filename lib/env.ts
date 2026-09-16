function clean(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;

  const value = raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
  return value.length > 0 ? value : undefined;
}

// Read an environment variable with an optional fallback value.
export function env(key: string): string | undefined;
export function env(key: string, fallback: string): string;
export function env(key: string, fallback?: string) {
  return clean(process.env[key]) ?? fallback;
}

// Read a required environment variable or throw a configuration error.
export function requireEnv(key: string): string {
  const value = clean(process.env[key]);

  if (!value) {
    throw new Error(
      `Missing environment variable: ${key}. Set it locally in .env and in your Vercel project settings, then redeploy.`,
    );
  }

  return value;
}

// Parse an environment variable as a finite number.
export function envNumber(key: string, fallback: number): number {
  const value = Number(clean(process.env[key]));
  return Number.isFinite(value) ? value : fallback;
}

// Parse an environment variable as a boolean flag.
export function envFlag(key: string): boolean {
  return clean(process.env[key])?.toLowerCase() === 'true';
}

// Parse a JSON-map environment variable and return an empty object when invalid.
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

// Check whether the application is running in production.
export const isProduction = () => process.env.NODE_ENV === 'production';
