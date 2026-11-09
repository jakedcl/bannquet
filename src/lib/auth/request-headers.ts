import { headers } from 'next/headers';

const NULL_ORIGIN = new Set(['', 'null', 'undefined']);

function trimOrigin(url: string): string {
  return url.replace(/\/$/, '');
}

/** Public site origin for auth when the incoming request does not send Origin. */
export function fallbackAuthOrigin(): string | null {
  const fromEnv = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  return fromEnv ? trimOrigin(fromEnv.trim()) : null;
}

function deriveOriginFromForwarded(headerList: Headers): string | null {
  const host = (headerList.get('x-forwarded-host') ?? headerList.get('host') ?? '')
    .split(',')[0]
    ?.trim();
  if (!host) return null;
  const proto = (headerList.get('x-forwarded-proto') ?? 'https').split(',')[0]?.trim() || 'https';
  return `${proto}://${host}`;
}

/**
 * Better Auth checks Origin on server actions; Vercel often omits it. Clone the
 * request headers and synthesize Origin (and Referer when missing) from proxies.
 */
export async function authRequestHeaders(): Promise<{ headers: Headers }> {
  const incoming = await headers();
  const out = new Headers();
  incoming.forEach((value, key) => {
    out.append(key, value);
  });

  const currentOrigin = out.get('origin');
  const needsOrigin = !currentOrigin || NULL_ORIGIN.has(currentOrigin.toLowerCase());
  const origin =
    (needsOrigin ? deriveOriginFromForwarded(out) : null) ??
    (needsOrigin ? fallbackAuthOrigin() : null) ??
  currentOrigin;

  if (needsOrigin && origin) {
    out.set('origin', origin);
    const referer = out.get('referer');
    if (!referer || NULL_ORIGIN.has(referer.toLowerCase())) {
      out.set('referer', `${origin}/sign-in`);
    }
  }

  return { headers: out };
}
