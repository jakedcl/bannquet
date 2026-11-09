import { NextRequest, NextResponse } from 'next/server';
import { isAuthConfigured } from '@/lib/auth/server';
import { AUTH_SESSION_COOKIE_NAME } from '@/lib/auth/cookie-names';
import {
  authCookiesForRequest,
  processSelfHostedAuthMiddleware,
} from '@/lib/auth/proxy-middleware';
import { signInPath } from '@/lib/sign-in-next';

const PROTECTED = ['/settings', '/account', '/admin'];

function isProtected(pathname: string): boolean {
  return PROTECTED.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Every page load refreshes the auth session here, the one place before
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

  const hasSession = request.cookies.has(AUTH_SESSION_COOKIE_NAME);
  if (!hasSession && !guarded) return NextResponse.next();

  const loginUrl = new URL(signInPath(`${pathname}${search}`), request.url);
  const result = await processSelfHostedAuthMiddleware({
    request,
    pathname,
    loginUrl,
    guarded,
  });

  if (result.action === 'allow') {
    const cookies = result.cookies ?? [];
    const response = NextResponse.next({
      request: { headers: authCookiesForRequest(request, cookies) },
    });
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
