import { createNeonAuth } from '@neondatabase/auth/next/server';

const MIN_SECRET_LENGTH = 32;

export function isAuthConfigured(): boolean {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  return Boolean(baseUrl && secret && secret.length >= MIN_SECRET_LENGTH);
}

/** Base URL and cookie secret, for the proxy's session refresh. */
export function authSettings(): { baseUrl: string; secret: string } {
  if (!isAuthConfigured()) throw new Error('Neon Auth is not configured');
  return { baseUrl: process.env.NEON_AUTH_BASE_URL!, secret: process.env.NEON_AUTH_COOKIE_SECRET! };
}

type NeonAuth = ReturnType<typeof createNeonAuth>;

let auth: NeonAuth | undefined;

export function getAuth(): NeonAuth {
  if (!auth) {
    const { baseUrl, secret } = authSettings();
    auth = createNeonAuth({ baseUrl, cookies: { secret } });
  }
  return auth;
}
