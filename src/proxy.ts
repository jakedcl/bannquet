import { NextRequest, NextResponse } from 'next/server';
import {
  DEFAULT_AUTH_SKIP_ROUTES,
  NEON_AUTH_COOKIE_PREFIX,
  NEON_AUTH_SESSION_COOKIE_NAME,
  parseSetCookies,
  processAuthMiddleware,
} from '@neondatabase/auth/server';
import { authSettings, isAuthConfigured } from '@/lib/auth/server';
import { signInPath } from '@/lib/sign-in-next';

const PROTECTED = ['/settings', '/account', '/admin'];

function isProtected(pathname: string): boolean {
  return PROTECTED.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Copies the refreshed auth cookies into the request the page sees, so the
 * page's own getSession() reads a fresh session and never has to write a
 * cookie. Next only allows cookie writes in actions and route handlers, so a
 * write during render crashed the page with a 500.
 */
function requestWithCookies(request: NextRequest, setCookies: string[]): Headers {
  const headers = new Headers(request.headers);
  if (setCookies.length === 0) return headers;
  const jar = new Map<string, string>();
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0) jar.set(part.slice(0, at).trim(), part.slice(at + 1).trim());
  }
  for (const header of setCookies) {
    for (const cookie of parseSetCookies(header)) {
      if (!cookie.name.startsWith(NEON_AUTH_COOKIE_PREFIX)) continue;
      const maxAge = Number(cookie.maxAge);
      if (!cookie.value || (Number.isFinite(maxAge) && maxAge <= 0)) jar.delete(cookie.name);
      else jar.set(cookie.name, cookie.value);
    }
  }
  headers.set('cookie', [...jar].map(([name, value]) => `${name}=${value}`).join('; '));
  return headers;
}

/**
 * Every page load refreshes the Neon Auth session here, the one place before
 * render where cookies can be written. Only /settings, /account and /admin
 * send signed-out visitors to sign in; everything else stays public.
 */
export async function proxy(request: NextRequest) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  const guarded = isProtected(pathname);

  if (!isAuthConfigured()) {
    if (!guarded) return NextResponse.next();
    const url = new URL(signInPath(`${pathname}${search}`), request.url);
    url.searchParams.set('error', 'setup');
    return NextResponse.redirect(url);
  }

  const hasSession = request.cookies.has(NEON_AUTH_SESSION_COOKIE_NAME);
  if (!hasSession && !guarded) return NextResponse.next();

  const { baseUrl, secret } = authSettings();
  const result = await processAuthMiddleware({
    request,
    pathname,
    skipRoutes: guarded ? DEFAULT_AUTH_SKIP_ROUTES : [pathname],
    loginUrl: signInPath(`${pathname}${search}`),
    baseUrl,
    cookieSecret: secret,
  });

  if (result.action === 'allow') {
    const cookies = result.cookies ?? [];
    const response = NextResponse.next({ request: { headers: requestWithCookies(request, cookies) } });
    for (const cookie of cookies) response.headers.append('Set-Cookie', cookie);
    return response;
  }
  const response = NextResponse.redirect(result.redirectUrl);
  for (const cookie of result.cookies ?? []) response.headers.append('Set-Cookie', cookie);
  return response;
}

// Page GETs only. Server action POSTs (next-action header) must never pass
// through: a redirect here broke forms (see docs/environments.md and the
// dev framework's server-action-redirects lesson). Actions check sign-in
// themselves. Next reads this at build time, so it stays plain literals.
export const config = {
  matcher: [
    {
      source: '/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)',
      missing: [{ type: 'header', key: 'next-action' }],
    },
  ],
};
