const PLACEHOLDER = /^(untitled|no title)$/i;

/** Blank, "Untitled", and "No title" all read as Route. */
export function routeTitle(value: string | null | undefined): string {
  const title = value?.trim() ?? '';
  if (!title || PLACEHOLDER.test(title)) return 'Route';
  return title;
}

/** Empty titles are stored as null. Placeholders are not kept. */
export function cleanRouteTitle(value: string | null | undefined): string | null {
  const title = value?.trim().slice(0, 120) ?? '';
  if (!title || PLACEHOLDER.test(title)) return null;
  return title;
}
