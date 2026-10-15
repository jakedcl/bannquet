export const PROFILE_PREVIEW = 6;
export const PROFILE_PAGE = 30;

export function listPage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 1000) return 1;
  return n;
}

export function slicePage<T>(items: T[], page: number, size = PROFILE_PAGE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(page, 1), pages);
  const start = (current - 1) * size;
  return { rows: items.slice(start, start + size), page: current, pages, total: items.length };
}
