import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { nextCookies } from 'better-auth/next-js';
import { getDb } from '@/db';
import { authSchema } from '@/db/auth-schema';

const MIN_SECRET_LENGTH = 32;
const SESSION_COOKIE_PREFIX = 'neon-auth';

function authSecret(): string | undefined {
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.NEON_AUTH_COOKIE_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) return undefined;
  return secret;
}

export function trustedOriginsFromEnv(): string[] {
  const out = new Set<string>();
  const add = (value: string | undefined) => {
    const trimmed = value?.trim();
    if (trimmed) out.add(trimmed);
  };
  add(process.env.BETTER_AUTH_URL);
  add(process.env.NEXT_PUBLIC_APP_URL);
  for (const part of (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '').split(',')) {
    add(part);
  }
  add('http://localhost:3000');
  add('https://www.bannquet.com');
  // Bannquet Vercel previews only (not all of *.vercel.app).
  out.add('https://bannquet-*-dcldev.vercel.app');
  return [...out];
}

export function createBetterAuth() {
  const secret = authSecret();
  if (!secret) {
    throw new Error('Auth secret is not configured');
  }

  return betterAuth({
    secret,
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    trustedOrigins: trustedOriginsFromEnv(),
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      schema: authSchema,
      schemaName: 'neon_auth',
      camelCase: true,
    }),
    advanced: {
      cookiePrefix: SESSION_COOKIE_PREFIX,
      database: {
        validateSchema: false,
        // Managed Neon Auth created uuid primary keys; default nanoid ids fail inserts.
        generateId: 'uuid',
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    plugins: [nextCookies()],
  });
}

type AuthInstance = ReturnType<typeof createBetterAuth>;

let instance: AuthInstance | undefined;

export function getAuthInstance(): AuthInstance {
  if (!instance) {
    instance = createBetterAuth();
  }
  return instance;
}
