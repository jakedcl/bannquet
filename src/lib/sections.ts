export type NavLink = {
  href: string;
  label: string;
};

export type NavAccount = {
  handle: string | null;
  role: 'member' | 'admin' | 'pending';
} | null;

export const COMMUNITY_LINKS: NavLink[] = [
  { href: '/chat', label: 'Chat' },
  { href: '/peaks', label: 'Peaks' },
  { href: '/trips', label: 'Trips' },
  { href: '/gear', label: 'Gear' },
];

export const UPLOAD_LINKS: NavLink[] = [
  { href: '/upload?kind=route', label: 'Route' },
  { href: '/upload?kind=pin', label: 'Pin' },
  { href: '/upload?kind=photo', label: 'Photo' },
];

const COMMUNITY_ROOTS = ['/community', '/chat', '/peaks', '/trips', '/gear'];

const PROFILE_LISTS: Record<string, string> = {
  trips: 'Trips',
  routes: 'Routes',
  pins: 'Pins',
  photos: 'Photos',
  climbs: 'Climbs',
};

export type Crumb = {
  parentHref: string;
  parent: string;
  current: string;
};

export type SectionMatch = {
  id: 'community' | 'upload' | 'settings';
  href: string;
  label: string;
  links: NavLink[];
  landing: boolean;
  crumb: Crumb | null;
};

export function pathOn(pathname: string, href: string): boolean {
  const path = href.split('?')[0];
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function linkOn(pathname: string, search: string, href: string): boolean {
  const [path, query] = href.split('?');
  if (path.startsWith('/user/')) return pathname === path;
  if (!query) return pathOn(pathname, path);
  if (pathname !== path) return false;
  const want = new URLSearchParams(query);
  const have = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  for (const [key, value] of want) {
    if (have.get(key) !== value) return false;
  }
  return true;
}

export function communitySection(pathname: string): boolean {
  return COMMUNITY_ROOTS.some((href) => pathOn(pathname, href));
}

export function settingsLinks(account: NavAccount): NavLink[] {
  const links: NavLink[] = [
    { href: account?.handle ? `/user/${account.handle}` : '/settings', label: 'Profile' },
    { href: '/settings', label: 'Settings' },
  ];
  if (account?.role === 'admin') links.push({ href: '/admin', label: 'Admin' });
  return links;
}

export function settingsSection(pathname: string, account: NavAccount): boolean {
  if (!account) return false;
  if (pathOn(pathname, '/settings') || pathOn(pathname, '/admin')) return true;
  const profile = account.handle ? `/user/${account.handle}` : null;
  return profile != null && pathname === profile;
}

export function profileListCrumb(pathname: string): Crumb | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length !== 3 || parts[0] !== 'user') return null;
  const current = PROFILE_LISTS[parts[2]];
  if (!current) return null;
  return { parentHref: `/user/${parts[1]}`, parent: 'Profile', current };
}

export function matchSection(pathname: string, search: string, account: NavAccount): SectionMatch | null {
  if (communitySection(pathname)) {
    const landing = pathname === '/community';
    const current = COMMUNITY_LINKS.find((link) => pathOn(pathname, link.href))?.label ?? null;
    return {
      id: 'community',
      href: '/community',
      label: 'Community',
      links: COMMUNITY_LINKS,
      landing,
      crumb: !landing && current ? { parentHref: '/community', parent: 'Community', current } : null,
    };
  }

  if (pathOn(pathname, '/upload')) {
    const current = UPLOAD_LINKS.find((link) => linkOn(pathname, search, link.href))?.label ?? null;
    return {
      id: 'upload',
      href: '/upload',
      label: 'Upload',
      links: UPLOAD_LINKS,
      landing: !current,
      crumb: current ? { parentHref: '/upload', parent: 'Upload', current } : null,
    };
  }

  if (!settingsSection(pathname, account)) return null;
  const onAdmin = pathOn(pathname, '/admin');
  const profile = account?.handle ? `/user/${account.handle}` : null;
  const onProfile = profile != null && pathname === profile;
  const current = onAdmin ? 'Admin' : onProfile ? 'Profile' : null;
  return {
    id: 'settings',
    href: '/settings',
    label: 'Settings',
    links: settingsLinks(account),
    landing: pathname === '/settings',
    crumb: current ? { parentHref: '/settings', parent: 'Settings', current } : null,
  };
}
