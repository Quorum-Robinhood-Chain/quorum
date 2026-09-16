// Single shared admin login (v1) — signed HMAC cookie, no session store.

export const ADMIN_SESSION_COOKIE = "quorum_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function getSecret(): string {
  // Dev-only fallback secret — set ADMIN_SESSION_SECRET in production.
  return process.env.ADMIN_SESSION_SECRET ?? "quorum-dev-secret-change-me";
}

export function getAdminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME ?? "admin",
    password: process.env.ADMIN_PASSWORD ?? "quorum2026",
  };
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(str.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return base64UrlEncode(new Uint8Array(sig));
}

/** Creates a signed session token: base64url(payload).base64url(hmac) */
export async function createSessionToken(username: string): Promise<string> {
  const payload = JSON.stringify({
    u: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(payload));
  const sig = await hmac(payloadB64, getSecret());
  return `${payloadB64}.${sig}`;
}

/** Reads and verifies the admin session cookie from a NextRequest. Returns the username, or null. */
export async function requireAdminSession(req: { cookies: { get(name: string): { value: string } | undefined } }): Promise<string | null> {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

/** Verifies a session token's signature and expiry. Returns the username, or null. */
export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  const expectedSig = await hmac(payloadB64, getSecret());
  if (expectedSig !== sig) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return typeof payload.u === "string" ? payload.u : null;
  } catch {
    return null;
  }
}
