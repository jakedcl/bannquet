import { APIError } from 'better-auth/api';
import { toNextJsHandler } from 'better-auth/next-js';
import { getAuthInstance } from '@/lib/auth/instance';
import { authRequestHeaders } from '@/lib/auth/request-headers';

const MIN_SECRET_LENGTH = 32;

export type AuthApiError = { message?: string; code?: string };

/** Postgres / driver text from error.cause chains (never passwords or email). */
function databaseErrorDetail(error: unknown): string | null {
  const parts: string[] = [];
  let current: unknown = error;
  const visited = new Set<object>();

  for (let depth = 0; depth < 8 && current; depth += 1) {
    if (typeof current === 'object' && current !== null) {
      if (visited.has(current)) break;
      visited.add(current);
    }

    if (current instanceof Error) {
      const pg = current as Error & { code?: string; detail?: string };
      if (pg.code) {
        parts.push(pg.detail ? `${pg.code}: ${current.message} (${pg.detail})` : `${pg.code}: ${current.message}`);
      } else if (
        current.message &&
        !current.message.includes('insert into') &&
        !current.message.includes('values ($')
      ) {
        parts.push(current.message);
      }
      current = current.cause;
      continue;
    }

    if (typeof current === 'object' && current !== null) {
      const record = current as { cause?: unknown; message?: string; code?: string; detail?: string };
      if (record.code && record.message) {
        parts.push(
          record.detail
            ? `${record.code}: ${record.message} (${record.detail})`
            : `${record.code}: ${record.message}`,
        );
      }
      if (record.cause) {
        current = record.cause;
        continue;
      }
    }
    break;
  }

  if (parts.length === 0) return null;
  return [...new Set(parts)].join(' | ');
}

function toApiError(error: unknown): AuthApiError {
  if (error instanceof APIError) {
    const body = error.body as { message?: string; code?: string } | undefined;
    return {
      message: body?.message ?? error.message,
      code: body?.code ?? String(error.status),
    };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: 'unknown' };
}

function logAuthApiFailure(scope: string, error: unknown): AuthApiError {
  const mapped = toApiError(error);
  const detail = databaseErrorDetail(error);
  console.error(`[auth] ${scope} failed`, {
    code: mapped.code ?? null,
    message: mapped.message ?? 'unknown',
    ...(detail ? { database: detail } : {}),
  });
  return mapped;
}

export function isAuthConfigured(): boolean {
  if (!process.env.DATABASE_URL) return false;
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.NEON_AUTH_COOKIE_SECRET;
  return Boolean(secret && secret.length >= MIN_SECRET_LENGTH);
}

/** Cookie secret and public base URL (for docs and legacy callers). */
export function authSettings(): { baseUrl: string; secret: string } {
  if (!isAuthConfigured()) throw new Error('Auth is not configured');
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.NEON_AUTH_COOKIE_SECRET!;
  const baseUrl =
    process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return { baseUrl, secret };
}

export function getAuth() {
  const auth = getAuthInstance();
  const routes = toNextJsHandler(auth);

  return {
    getSession: async () => {
      try {
        const data = await auth.api.getSession(await authRequestHeaders());
        return { data };
      } catch (error) {
        logAuthApiFailure('getSession', error);
        return { data: null };
      }
    },
    signIn: {
      email: async (input: { email: string; password: string; rememberMe?: boolean }) => {
        try {
          await auth.api.signInEmail({
            body: input,
            ...(await authRequestHeaders()),
          });
          return { error: null };
        } catch (error) {
          return { error: logAuthApiFailure('signIn.email', error) };
        }
      },
    },
    signUp: {
      email: async (input: { email: string; password: string; name: string }) => {
        try {
          await auth.api.signUpEmail({
            body: input,
            ...(await authRequestHeaders()),
          });
          return { error: null };
        } catch (error) {
          return { error: logAuthApiFailure('signUp.email', error) };
        }
      },
    },
    signOut: async () => {
      await auth.api.signOut(await authRequestHeaders());
    },
    requestPasswordReset: async (input: { email: string; redirectTo: string }) => {
      try {
        await auth.api.requestPasswordReset({
          body: input,
          ...(await authRequestHeaders()),
        });
        return { error: null };
      } catch (error) {
        return { error: logAuthApiFailure('requestPasswordReset', error) };
      }
    },
    resetPassword: async (input: { newPassword: string; token: string }) => {
      try {
        await auth.api.resetPassword({
          body: input,
          ...(await authRequestHeaders()),
        });
        return { error: null };
      } catch (error) {
        return { error: logAuthApiFailure('resetPassword', error) };
      }
    },
    handler: () => routes,
  };
}
