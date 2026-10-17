import { REGION_OPTIONS, isRegionCode } from '@/lib/regions';

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

const COMMUNITY_PAGES: Record<string, string> = {
  '/chat': 'Chat',
  '/peaks': 'Peaks',
  '/trips': 'Trips',
  '/gear': 'Gear',
  '/members': 'Members',
};

const STATE_NAMES: Record<string, string> = {
  ny: 'New York',
  vt: 'Vermont',
  nh: 'New Hampshire',
  me: 'Maine',
};

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

export const FISHING_LINKS: NavLink[] = [
  { href: '/fishing/saltwater', label: 'Saltwater' },
  { href: '/fishing/freshwater', label: 'Freshwater' },
];

export type HomeAction = {
  id: string;
  href: string;
  label: string;
  links: NavLink[];
};

export const HOME_ACTIONS: HomeAction[] = [
  { id: 'weather', href: '/mountain-weather', label: 'Mountain Weather', links: WEATHER_LINKS },
  { id: 'map', href: '/map', label: 'Map', links: [] },
  { id: 'fishing', href: '/fishing', label: 'Fishing', links: FISHING_LINKS },
  { id: 'community', href: '/community', label: 'Community', links: COMMUNITY_LINKS },
];

export type SectionMatch = {
  id: 'community' | 'upload' | 'weather' | 'settings' | 'fishing';
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
  if (path === '/fishing') return pathname === '/fishing';
  if (path === '/fishing/freshwater') return pathname === path || /^\/fishing\/\d+$/.test(pathname);
  if (!query) return pathOn(pathname, path);
  if (pathname !== path) return false;
  const want = new URLSearchParams(query);
  const have = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (path === '/mountain-weather' && want.has('state')) {
    return have.get('state') === want.get('state');
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

export function fishingSection(pathname: string): boolean {
  return pathOn(pathname, '/fishing');
}

function fishingCurrent(pathname: string): string | null {
  const links = [...FISHING_LINKS].sort((a, b) => b.href.length - a.href.length);
  return links.find((link) => pathOn(pathname, link.href))?.label ?? null;
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

function communityTrail(href: string, label: string, leaf?: Crumb | null): Crumb[] {
  const crumbs: Crumb[] = [
    { href: '/community', label: 'Community' },
    { href, label },
  ];
  if (leaf) crumbs.push(leaf);
  return crumbs;
}

export function pageTrail(pathname: string, search: string, account: NavAccount, leaf?: string | null): PageTrail {
  const peak = pathname.match(/^\/peaks\/([^/]+)$/);
  if (peak) {
    return {
      parentHref: '/peaks',
      crumbs: communityTrail('/peaks', 'Peaks', named(pathname, 'Peak', leaf)),
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
      crumbs: communityTrail('/trips', 'Trips', { href: pathname, label: 'New trip' }),
    };
  }

  if (/^\/trips\/[^/]+$/.test(pathname)) {
    return {
      parentHref: '/trips',
      crumbs: communityTrail('/trips', 'Trips', named(pathname, 'Trip', leaf)),
    };
  }

  if (/^\/gear\/[^/]+$/.test(pathname)) {
    return {
      parentHref: '/gear',
      crumbs: communityTrail('/gear', 'Gear', named(pathname, 'Gear', leaf)),
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
    if (!current) return { parentHref: '/', crumbs: [{ href: '/upload', label: 'Upload' }] };
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

  if (pathname === '/community') {
    return { parentHref: '/', crumbs: [{ href: '/community', label: 'Community' }] };
  }

  if (COMMUNITY_PAGES[pathname]) {
    return {
      parentHref: '/community',
      crumbs: communityTrail(pathname, COMMUNITY_PAGES[pathname]),
    };
  }

  if (pathname === '/mountain-weather') {
    const requested = new URLSearchParams(search).get('state');
    if (!isRegionCode(requested)) {
      return { parentHref: '/', crumbs: [{ href: '/mountain-weather', label: 'Mountain Weather' }] };
    }
    const name = STATE_NAMES[requested] ?? requested.toUpperCase();
    return {
      parentHref: '/mountain-weather',
      crumbs: [
        { href: '/mountain-weather', label: 'Mountain Weather' },
        { href: `/mountain-weather?state=${requested}`, label: name },
      ],
    };
  }

  if (pathname === '/fishing') {
    return { parentHref: '/', crumbs: [{ href: '/fishing', label: 'Fishing' }] };
  }

  if (/^\/fishing\/\d+$/.test(pathname)) {
    return {
      parentHref: '/fishing/freshwater',
      crumbs: [
        { href: '/fishing', label: 'Fishing' },
        { href: '/fishing/freshwater', label: 'Freshwater' },
        named(pathname, 'Gauge', leaf),
      ],
    };
  }

  if (/^\/fishing\/saltwater\/[^/]+$/.test(pathname)) {
    return {
      parentHref: '/fishing/saltwater',
      crumbs: [
        { href: '/fishing', label: 'Fishing' },
        { href: '/fishing/saltwater', label: 'Saltwater' },
        named(pathname, 'Spot', leaf),
      ],
    };
  }

  if (pathname === '/fishing/stocking' || pathname === '/fishing/guides') {
    const label = pathname === '/fishing/stocking' ? 'Stocking' : 'Guides';
    return {
      parentHref: '/fishing',
      crumbs: [
        { href: '/fishing', label: 'Fishing' },
        { href: pathname, label },
      ],
    };
  }

  if (pathOn(pathname, '/fishing')) {
    const current = fishingCurrent(pathname);
    if (!current) return { parentHref: '/fishing', crumbs: [{ href: '/fishing', label: 'Fishing' }] };
    return {
      parentHref: '/fishing',
      crumbs: [
        { href: '/fishing', label: 'Fishing' },
        { href: pathname, label: current },
      ],
    };
  }

  if (pathname === '/map') {
    return { parentHref: '/', crumbs: [{ href: '/map', label: 'Map' }] };
  }

  const segment = decodeURIComponent(pathname.split('/').filter(Boolean).at(-1) ?? '');
  if (!segment) return { parentHref: '/', crumbs: null };
  const label = segment.replace(/[-_]/g, ' ');
  return { parentHref: '/', crumbs: [{ href: pathname, label }] };
}

export function matchSection(pathname: string, search: string, account: NavAccount): SectionMatch | null {
  if (fishingSection(pathname)) {
    return {
      id: 'fishing',
      href: '/fishing',
      label: 'Fishing',
      links: FISHING_LINKS,
      landing: false,
    };
  }

  if (communitySection(pathname, account)) {
    return {
      id: 'community',
      href: '/community',
      label: 'Community',
      links: COMMUNITY_LINKS,
      landing: false,
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
