import { headers } from 'next/headers';
import { APIError } from 'better-auth/api';
import { toNextJsHandler } from 'better-auth/next-js';
import { getAuthInstance } from '@/lib/auth/instance';

const MIN_SECRET_LENGTH = 32;

export type AuthApiError = { message?: string; code?: string };

async function requestHeaders() {
  return { headers: await headers() };
}

function toApiError(error: unknown): AuthApiError {
  if (error instanceof APIError) {
    return {
      message: error.message,
      code: error.body?.code?.toString() ?? String(error.status),
    };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: 'unknown' };
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
        const data = await auth.api.getSession(await requestHeaders());
        return { data };
      } catch (error) {
        console.error('[auth] getSession failed', toApiError(error).message);
        return { data: null };
      }
    },
    signIn: {
      email: async (input: { email: string; password: string; rememberMe?: boolean }) => {
        try {
          await auth.api.signInEmail({
            body: input,
            ...(await requestHeaders()),
          });
          return { error: null };
        } catch (error) {
          return { error: toApiError(error) };
        }
      },
    },
    signUp: {
      email: async (input: { email: string; password: string; name: string }) => {
        try {
          await auth.api.signUpEmail({
            body: input,
            ...(await requestHeaders()),
          });
          return { error: null };
        } catch (error) {
          return { error: toApiError(error) };
        }
      },
    },
    signOut: async () => {
      await auth.api.signOut(await requestHeaders());
    },
    requestPasswordReset: async (input: { email: string; redirectTo: string }) => {
      try {
        await auth.api.requestPasswordReset({
          body: input,
          ...(await requestHeaders()),
        });
        return { error: null };
      } catch (error) {
        return { error: toApiError(error) };
      }
    },
    resetPassword: async (input: { newPassword: string; token: string }) => {
      try {
        await auth.api.resetPassword({
          body: input,
          ...(await requestHeaders()),
        });
        return { error: null };
      } catch (error) {
        return { error: toApiError(error) };
      }
    },
    handler: () => routes,
  };
}
