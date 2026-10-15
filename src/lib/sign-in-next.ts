const BLOCKED = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password', '/auth', '/invite'];

/** Only same-site paths. Reject protocol-relative and off-site targets. */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  if (path.includes('\\') || path.includes('://') || path.includes('\0')) return null;
  const pathname = path.split('?')[0] ?? '';
  if (BLOCKED.some((item) => pathname === item || pathname.startsWith(`${item}/`))) return null;
  return path;
}

export function signInPath(next?: string | null): string {
  const safe = safeNextPath(next);
  if (!safe) return '/sign-in';
  return `/sign-in?next=${encodeURIComponent(safe)}`;
}
