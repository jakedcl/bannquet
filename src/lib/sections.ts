import { DEFAULT_REGION, REGION_OPTIONS } from '@/lib/regions';

export type NavLink = {
  href: string;
  label: string;
  hidden?: boolean;
};

export function visibleLinks(links: readonly NavLink[]): NavLink[] {
  return links.filter((link) => !link.hidden);
}

export type NavAccount = {
  handle: string | null;
  role: 'member' | 'admin' | 'pending';
} | null;

export const COMMUNITY_LINKS: NavLink[] = [
  { href: '/chat', label: 'Chat' },
  { href: '/peaks', label: 'Peaks' },
  { href: '/trips', label: 'Trips' },
  { href: '/gear', label: 'Gear' },
  { href: '/members', label: 'Members' },
];

export const WEATHER_LINKS: NavLink[] = REGION_OPTIONS.map((option) => ({
  href: `/mountain-weather?state=${option.code}`,
  label: option.label,
}));

export const UPLOAD_LINKS: NavLink[] = [
  { href: '/upload?kind=trip', label: 'Trip' },
  { href: '/upload?kind=route', label: 'Route' },
  { href: '/upload?kind=pin', label: 'Pin' },
  { href: '/upload?kind=photo', label: 'Photo' },
];

const COMMUNITY_ROOTS = ['/community', '/chat', '/peaks', '/trips', '/gear', '/members'];

const PROFILE_LISTS: Record<string, string> = {
  trips: 'Trips',
  routes: 'Routes',
  pins: 'Pins',
  photos: 'Photos',
  climbs: 'Climbs',
};

export type Crumb = {
  href: string;
  label: string;
};

export type PageTrail = {
  parentHref: string;
  crumbs: Crumb[] | null;
};

export type SectionMatch = {
  id: 'community' | 'upload' | 'weather' | 'settings';
  href: string;
  label: string;
  links: NavLink[];
  landing: boolean;
};

export function pathOn(pathname: string, href: string): boolean {
  const path = href.split('?')[0];
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function linkOn(pathname: string, search: string, href: string): boolean {
  const [path, query] = href.split('?');
  if (path.startsWith('/user/')) return pathname === path;
  if (path === '/members' && pathname.startsWith('/user/')) return true;
  if (!query) return pathOn(pathname, path);
  if (pathname !== path) return false;
  const want = new URLSearchParams(query);
  const have = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (path === '/mountain-weather' && want.has('state')) {
    return (have.get('state') || DEFAULT_REGION) === want.get('state');
  }
  for (const [key, value] of want) {
    if (have.get(key) !== value) return false;
  }
  return true;
}

export function ownProfile(pathname: string, account: NavAccount): boolean {
  if (!account?.handle) return false;
  const base = `/user/${account.handle}`;
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function communitySection(pathname: string, account: NavAccount = null): boolean {
  if (COMMUNITY_ROOTS.some((href) => pathOn(pathname, href))) return true;
  if (!pathname.startsWith('/user/')) return false;
  return !ownProfile(pathname, account);
}

export function settingsLinks(account: NavAccount): NavLink[] {
  const links: NavLink[] = [];
  if (account?.handle) links.push({ href: `/user/${account.handle}`, label: 'Profile' });
  links.push({ href: '/account', label: 'Account', hidden: true });
  if (account?.role === 'admin') links.push({ href: '/admin', label: 'Admin' });
  return links;
}

export function settingsHref(account: NavAccount): string {
  if (account?.handle) return `/user/${account.handle}`;
  return '/account';
}

export function settingsSection(pathname: string, account: NavAccount): boolean {
  if (!account) return false;
  if (pathOn(pathname, '/settings') || pathOn(pathname, '/account') || pathOn(pathname, '/admin')) return true;
  return ownProfile(pathname, account);
}

function named(href: string, label: string, leaf: string | null | undefined): Crumb {
  return { href, label: leaf?.trim() || label };
}

export function pageTrail(pathname: string, search: string, account: NavAccount, leaf?: string | null): PageTrail {
  const peak = pathname.match(/^\/peaks\/([^/]+)$/);
  if (peak) {
    return {
      parentHref: '/peaks',
      crumbs: [
        { href: '/peaks', label: 'Peaks' },
        named(pathname, 'Peak', leaf),
      ],
    };
  }

  const member = pathname.match(/^\/user\/([^/]+)(?:\/([^/]+))?$/);
  if (member) {
    const handle = decodeURIComponent(member[1]);
    const profileHref = `/user/${handle}`;
    const crumbs: Crumb[] = [
      { href: '/community', label: 'Community' },
      { href: '/members', label: 'Members' },
      { href: profileHref, label: handle },
    ];
    const section = member[2] ? PROFILE_LISTS[member[2]] : null;
    if (!section) return { parentHref: '/members', crumbs };
    crumbs.push({ href: pathname, label: section });
    return { parentHref: profileHref, crumbs };
  }

  if (pathname === '/trips/new') {
    return {
      parentHref: '/trips',
      crumbs: [
        { href: '/trips', label: 'Trips' },
        { href: pathname, label: 'New trip' },
      ],
    };
  }

  if (/^\/trips\/[^/]+$/.test(pathname)) {
    return {
      parentHref: '/trips',
      crumbs: [
        { href: '/trips', label: 'Trips' },
        named(pathname, 'Trip', leaf),
      ],
    };
  }

  if (/^\/gear\/[^/]+$/.test(pathname)) {
    return {
      parentHref: '/gear',
      crumbs: [
        { href: '/gear', label: 'Gear' },
        named(pathname, 'Gear', leaf),
      ],
    };
  }

  if (/^\/pins\/[^/]+$/.test(pathname)) {
    return {
      parentHref: '/map',
      crumbs: [
        { href: '/map', label: 'Map' },
        named(pathname, 'Pin', leaf),
      ],
    };
  }

  if (/^\/routes\/[^/]+$/.test(pathname)) {
    return {
      parentHref: '/map',
      crumbs: [
        { href: '/map', label: 'Map' },
        named(pathname, 'Route', leaf),
      ],
    };
  }

  if (/^\/photos\/[^/]+$/.test(pathname)) {
    return {
      parentHref: '/map',
      crumbs: [
        { href: '/map', label: 'Map' },
        named(pathname, 'Photo', leaf),
      ],
    };
  }

  if (pathname === '/upload') {
    const kind = new URLSearchParams(search).get('kind');
    const current = UPLOAD_LINKS.find((link) => link.href === `/upload?kind=${kind}`);
    if (!current) return { parentHref: '/', crumbs: null };
    return {
      parentHref: '/upload',
      crumbs: [
        { href: '/upload', label: 'Upload' },
        { href: current.href, label: current.label },
      ],
    };
  }

  if (pathOn(pathname, '/account')) {
    const profile = account?.handle ? `/user/${account.handle}` : null;
    if (!profile) return { parentHref: '/', crumbs: null };
    return {
      parentHref: profile,
      crumbs: [
        { href: profile, label: 'Profile' },
        { href: '/account', label: 'Account' },
      ],
    };
  }

  if (pathOn(pathname, '/admin')) {
    const profile = account?.handle ? `/user/${account.handle}` : null;
    if (!profile) return { parentHref: '/', crumbs: null };
    return {
      parentHref: profile,
      crumbs: [
        { href: profile, label: 'Profile' },
        { href: '/admin', label: 'Admin' },
      ],
    };
  }

  if (pathname === '/conditions') {
    return {
      parentHref: '/mountain-weather',
      crumbs: [
        { href: '/mountain-weather', label: 'Mountain Weather' },
        { href: '/conditions', label: 'Conditions' },
      ],
    };
  }

  if (pathOn(pathname, '/weather')) {
    return {
      parentHref: '/mountain-weather',
      crumbs: [
        { href: '/mountain-weather', label: 'Mountain Weather' },
        { href: pathname, label: 'Weather' },
      ],
    };
  }

  return { parentHref: '/', crumbs: null };
}

export function matchSection(pathname: string, search: string, account: NavAccount): SectionMatch | null {
  if (communitySection(pathname, account)) {
    return {
      id: 'community',
      href: '/community',
      label: 'Community',
      links: COMMUNITY_LINKS,
      landing: pathname === '/community',
    };
  }

  if (pathOn(pathname, '/mountain-weather') || pathname === '/conditions' || pathOn(pathname, '/weather')) {
    return {
      id: 'weather',
      href: '/mountain-weather',
      label: 'Mountain Weather',
      links: WEATHER_LINKS,
      landing: false,
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
    };
  }

  return null;
}
