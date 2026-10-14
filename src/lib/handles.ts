const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,22}[a-z0-9])$/;

export function isHandle(value: string): boolean {
  return HANDLE_PATTERN.test(value);
}

export function handleFromName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
    .replace(/-+$/g, '');

  if (isHandle(slug)) return slug;
  const padded = `friend-${slug}`.replace(/-+$/g, '').slice(0, 24).replace(/-+$/g, '');
  return isHandle(padded) ? padded : 'friend';
}

export function nextHandleCandidate(base: string, attempt: number): string {
  if (attempt <= 0) return base;
  const suffix = `-${attempt + 1}`;
  const trimmed = `${base.slice(0, Math.max(1, 24 - suffix.length))}${suffix}`.replace(/-+$/g, '');
  return isHandle(trimmed) ? trimmed : `${base.slice(0, 16)}${suffix}`.slice(0, 24);
}
