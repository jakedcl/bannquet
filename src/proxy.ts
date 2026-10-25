import { NextRequest, NextResponse } from 'next/server';
import { getAuth, isAuthConfigured } from '@/lib/auth/server';
import { signInPath } from '@/lib/sign-in-next';

export async function proxy(request: NextRequest) {
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (!isAuthConfigured()) {
    const url = new URL(signInPath(next), request.url);
    url.searchParams.set('error', 'setup');
    return NextResponse.redirect(url);
  }
  return getAuth().middleware({ loginUrl: signInPath(next) })(request);
}

// Page loads only. A server action POST sent through here while signed out
// got a 307 to /sign-in, which broke the form. Actions check sign-in themselves.
// Next reads this config at build time, so it has to stay plain literals.
export const config = {
  matcher: [
    { source: '/settings', missing: [{ type: 'header', key: 'next-action' }] },
    { source: '/settings/:path*', missing: [{ type: 'header', key: 'next-action' }] },
    { source: '/account', missing: [{ type: 'header', key: 'next-action' }] },
    { source: '/account/:path*', missing: [{ type: 'header', key: 'next-action' }] },
    { source: '/admin', missing: [{ type: 'header', key: 'next-action' }] },
    { source: '/admin/:path*', missing: [{ type: 'header', key: 'next-action' }] },
  ],
};
