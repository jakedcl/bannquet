import { pathOn, settingsSection, type NavAccount } from '@/lib/sections';

export type TabId = 'map' | 'trips' | 'upload' | 'weather' | 'profile';

/** Which bottom tab or top bar link a path belongs to. */
export function activeTab(pathname: string, account: NavAccount): TabId | null {
  if (pathname === '/' || pathOn(pathname, '/map') || pathOn(pathname, '/pins') || pathOn(pathname, '/routes')) return 'map';
  if (pathOn(pathname, '/trips')) return 'trips';
  if (pathOn(pathname, '/upload')) return 'upload';
  if (pathOn(pathname, '/mountain-weather') || pathOn(pathname, '/conditions')) return 'weather';
  if (pathOn(pathname, '/sign-in') || settingsSection(pathname, account)) return 'profile';
  return null;
}

export function profileHref(account: NavAccount): string {
  if (!account) return '/sign-in';
  return account.handle ? `/user/${account.handle}` : '/account';
}
