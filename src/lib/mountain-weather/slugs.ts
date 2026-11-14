export const STATE_CODES = ['ny', 'vt', 'nh', 'me'] as const;
export type MountainStateCode = (typeof STATE_CODES)[number];

export const STATE_SLUGS: Record<MountainStateCode, string> = {
  ny: 'new-york',
  vt: 'vermont',
  nh: 'new-hampshire',
  me: 'maine',
};

const SLUG_TO_CODE = Object.fromEntries(
  Object.entries(STATE_SLUGS).map(([code, slug]) => [slug, code as MountainStateCode]),
) as Record<string, MountainStateCode>;

const LEGACY_CODES = new Set<string>(STATE_CODES);

/** Canonical URL slug for a state (full name, hyphenated). */
export function mountainStateSlug(code: MountainStateCode): string {
  return STATE_SLUGS[code];
}

export function resolveMountainStateSlug(segment: string): MountainStateCode | null {
  if (LEGACY_CODES.has(segment)) return segment as MountainStateCode;
  return SLUG_TO_CODE[segment] ?? null;
}

export function isMountainStateSlug(segment: string): boolean {
  return resolveMountainStateSlug(segment) !== null;
}

export const PLACE_ID_ALIASES: Record<string, string> = {
  'mt-marcy': 'mount-marcy',
  'mt-mansfield': 'mount-mansfield',
  'mt-washington': 'mount-washington',
  'mt-lafayette': 'mount-lafayette',
};

export function canonicalPlaceId(id: string): string {
  return PLACE_ID_ALIASES[id] ?? id;
}

export function mountainWeatherPath(
  stateCode: MountainStateCode,
  sectionId?: string,
  placeId?: string,
): string {
  const base = `/mountain-weather/${mountainStateSlug(stateCode)}`;
  if (!sectionId) return base;
  if (!placeId) return `${base}/${sectionId}`;
  return `${base}/${sectionId}/${canonicalPlaceId(placeId)}`;
}
