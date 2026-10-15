import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { safeNextPath, signInPath } from '@/lib/sign-in-next';

export async function redirectToSignIn(next?: string | null): Promise<never> {
  let target = safeNextPath(next);
  if (!target) {
    const headerList = await headers();
    const referer = headerList.get('referer');
    const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
    if (referer && host) {
      try {
        const url = new URL(referer);
        if (url.host === host) target = safeNextPath(`${url.pathname}${url.search}`);
      } catch {
        target = null;
      }
    }
  }
  redirect(signInPath(target));
}
