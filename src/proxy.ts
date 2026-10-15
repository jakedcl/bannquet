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

export const config = {
  matcher: ['/settings', '/settings/:path*', '/admin', '/admin/:path*'],
};
