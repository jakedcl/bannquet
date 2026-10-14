import { createNeonAuth } from '@neondatabase/auth/next/server';

const MIN_SECRET_LENGTH = 32;

export function isAuthConfigured(): boolean {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  return Boolean(baseUrl && secret && secret.length >= MIN_SECRET_LENGTH);
}

type NeonAuth = ReturnType<typeof createNeonAuth>;

let auth: NeonAuth | undefined;

export function getAuth(): NeonAuth {
  if (!isAuthConfigured()) {
    throw new Error('Neon Auth is not configured');
  }
  if (!auth) {
    auth = createNeonAuth({
      baseUrl: process.env.NEON_AUTH_BASE_URL!,
      cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET!,
      },
    });
  }
  return auth;
}
