import { APIError } from 'better-auth/api';
import { toNextJsHandler } from 'better-auth/next-js';
import { getAuthInstance } from '@/lib/auth/instance';
import { authRequestHeaders } from '@/lib/auth/request-headers';

const MIN_SECRET_LENGTH = 32;

export type AuthApiError = { message?: string; code?: string };

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
  console.error(`[auth] ${scope} failed`, {
    code: mapped.code ?? null,
    message: mapped.message ?? 'unknown',
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
