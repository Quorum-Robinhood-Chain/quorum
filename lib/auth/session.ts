import { env, requireEnv, isProduction } from '@/lib/env';

export const ADMIN_SESSION_COOKIE = 'quorum_admin_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

// Use the required production secret or a development fallback.
function getSecret(): string {
  if (isProduction()) return requireEnv('ADMIN_SESSION_SECRET');
  return env('ADMIN_SESSION_SECRET', 'quorum-dev-secret-change-me');
}

// Get the configured admin login credentials.
export function getAdminCredentials() {
  return {
    username: env('ADMIN_USERNAME', 'admin'),
    password: env('ADMIN_PASSWORD', 'quorum2026'),
  };
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');

  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

// Create an HMAC-SHA256 signature for the session payload.
async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(data),
  );

  return base64UrlEncode(new Uint8Array(signature));
}

// Create a signed session token with an expiration timestamp.
export async function createSessionToken(username: string): Promise<string> {
  const payload = JSON.stringify({
    u: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });

  const payloadB64 = base64UrlEncode(new TextEncoder().encode(payload));
  return `${payloadB64}.${await hmac(payloadB64, getSecret())}`;
}

// Verify the session signature and expiration before returning the username.
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<string | null> {
  if (!token) return null;

  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return null;

  try {
    if ((await hmac(payloadB64, getSecret())) !== signature) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64)),
    );

    if (
      typeof payload.exp !== 'number' ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return typeof payload.u === 'string' ? payload.u : null;
  } catch {
    return null;
  }
}

// Verify the admin session from the request cookie.
export async function requireAdminSession(req: {
  cookies: { get(name: string): { value: string } | undefined };
}): Promise<string | null> {
  return verifySessionToken(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}
