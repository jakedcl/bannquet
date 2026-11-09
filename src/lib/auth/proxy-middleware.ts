import { getSessionCookie } from 'better-auth/cookies';
import { getAuthInstance } from '@/lib/auth/instance';
import {
  AUTH_COOKIE_PREFIX,
  AUTH_SESSION_COOKIE_NAME,
  LEGACY_SESSION_DATA_COOKIE,
} from '@/lib/auth/cookie-names';

export type ProxyMiddlewareResult =
  | { action: 'allow'; cookies: string[]; sessionUserId: string | null }
  | { action: 'redirect'; redirectUrl: URL; cookies?: string[] };

const AUTH_PATH_PREFIXES = [
  '/api/auth',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/invite',
];

function isAuthSurface(pathname: string): boolean {
  return AUTH_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function samePathOrChild(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

async function refreshSession(
  request: Request,
): Promise<{ cookies: string[]; userId: string | null }> {
  const auth = getAuthInstance();
  const url = new URL('/api/auth/get-session', request.url);
  const sessionResponse = await auth.handler(
    new Request(url, {
      method: 'GET',
      headers: request.headers,
    }),
  );

  const cookies = sessionResponse.headers.getSetCookie();
  let userId: string | null = null;
  if (sessionResponse.ok) {
    const payload = (await sessionResponse.json().catch(() => null)) as { user?: { id?: string } } | null;
    userId = payload?.user?.id ?? null;
  }
  return { cookies, userId };
}

/**
 * Refreshes the session cookie before render (same role as the old Neon Auth
 * middleware) and enforces sign-in on protected app routes.
 */
export async function processSelfHostedAuthMiddleware(input: {
  request: Request;
  pathname: string;
  loginUrl: URL;
  guarded: boolean;
}): Promise<ProxyMiddlewareResult> {
  const { request, pathname, loginUrl, guarded } = input;
  const requestUrl = new URL(request.url);

  if (loginUrl.origin === requestUrl.origin && samePathOrChild(pathname, loginUrl.pathname)) {
    return { action: 'allow', cookies: [], sessionUserId: null };
  }

  const hasSessionToken = Boolean(
    getSessionCookie(request, { cookiePrefix: 'neon-auth' }) ??
      request.headers.get('cookie')?.includes(AUTH_SESSION_COOKIE_NAME),
  );

  if (!hasSessionToken && !guarded) {
    return { action: 'allow', cookies: [], sessionUserId: null };
  }

  let cookies: string[] = [];
  let sessionUserId: string | null = null;
  if (hasSessionToken) {
    const refreshed = await refreshSession(request);
    cookies = refreshed.cookies;
    sessionUserId = refreshed.userId;
  }

  const cookieHeader = request.headers.get('cookie') ?? '';
  const hasStaleNeonCache =
    cookieHeader.includes(LEGACY_SESSION_DATA_COOKIE) && !cookieHeader.includes(AUTH_SESSION_COOKIE_NAME);

  if (guarded && !sessionUserId && !isAuthSurface(pathname)) {
    const redirectUrl = new URL(loginUrl);
    if (redirectUrl.origin === requestUrl.origin) {
      for (const [name, value] of requestUrl.searchParams) {
        if (!redirectUrl.searchParams.has(name)) {
          redirectUrl.searchParams.append(name, value);
        }
      }
    }
    const staleClear: string[] = [];
    if (hasStaleNeonCache) {
      staleClear.push(
        `${LEGACY_SESSION_DATA_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
      );
    }
    return {
      action: 'redirect',
      redirectUrl,
      cookies: staleClear.length ? staleClear : undefined,
    };
  }

  return { action: 'allow', cookies, sessionUserId };
}

export function authCookiesForRequest(
  request: Request,
  setCookies: string[],
): Headers {
  const headers = new Headers(request.headers);
  if (setCookies.length === 0) return headers;
  const jar = new Map<string, string>();
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0) jar.set(part.slice(0, at).trim(), part.slice(at + 1).trim());
  }
  for (const header of setCookies) {
    const semi = header.indexOf(';');
    const pair = semi > 0 ? header.slice(0, semi) : header;
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (!name.startsWith(AUTH_COOKIE_PREFIX)) continue;
    const maxAgeMatch = /(?:^|;)\s*Max-Age=(\d+)/i.exec(header);
    const maxAge = maxAgeMatch ? Number(maxAgeMatch[1]) : undefined;
    if (!value || (maxAge !== undefined && Number.isFinite(maxAge) && maxAge <= 0)) jar.delete(name);
    else jar.set(name, value);
  }
  headers.set('cookie', [...jar].map(([name, value]) => `${name}=${value}`).join('; '));
  return headers;
}
