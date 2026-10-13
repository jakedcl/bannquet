import { NextRequest, NextResponse } from 'next/server';
import { getAuth, isAuthConfigured } from '@/lib/auth/server';

export async function proxy(request: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.redirect(new URL('/sign-in?error=setup', request.url));
  }
  return getAuth().middleware({ loginUrl: '/sign-in' })(request);
}

export const config = {
  matcher: ['/settings', '/settings/:path*', '/admin', '/admin/:path*'],
};
