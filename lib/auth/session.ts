/**
 * Single shared admin login: signed HMAC cookie, no session store.
 *
 * Runs in BOTH runtimes — the Edge middleware verifies the cookie, the Node route
 * handlers issue it — so it uses WebCrypto only, and reads the secret through
 * lib/env.ts so both runtimes resolve the exact same value. A silent per-runtime
 * fallback secret is what previously made a valid session token fail verification.
 */
import { env, requireEnv, isProduction } from '@/lib/env';

export const ADMIN_SESSION_COOKIE = 'quorum_admin_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

/** Dev-only fallback; production must set ADMIN_SESSION_SECRET or this throws. */
function getSecret(): string {
  if (isProduction()) return requireEnv('ADMIN_SESSION_SECRET');
  return env('ADMIN_SESSION_SECRET', 'quorum-dev-secret-change-me');
}

export function getAdminCredentials() {
  return {
    username: env('ADMIN_USERNAME', 'admin'),
    password: env('ADMIN_PASSWORD', 'quorum2026'),
  };
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return base64UrlEncode(new Uint8Array(signature));
}

/** Creates a signed token: base64url(payload).base64url(signature) */
export async function createSessionToken(username: string): Promise<string> {
  const payload = JSON.stringify({
    u: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(payload));
  return `${payloadB64}.${await hmac(payloadB64, getSecret())}`;
}

/** Verifies signature + expiry. Returns the username, or null. */
export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;

  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return null;

  try {
    if ((await hmac(payloadB64, getSecret())) !== signature) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return typeof payload.u === 'string' ? payload.u : null;
  } catch {
    return null;
  }
}

/** Reads and verifies the session cookie off a request. */
export async function requireAdminSession(req: {
  cookies: { get(name: string): { value: string } | undefined };
}): Promise<string | null> {
  return verifySessionToken(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}
