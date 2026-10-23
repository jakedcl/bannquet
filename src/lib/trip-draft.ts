import type { ChatCatalogItem } from '@/lib/chat-view';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DraftItem = {
  kind: 'pin' | 'route' | 'photo';
  id: string;
  label: string;
  thumb: string | null;
  photoUrl?: string | null;
  photoThumbUrl?: string | null;
};

const FALLBACK: Record<DraftItem['kind'], string> = {
  pin: 'Pin',
  route: 'Route',
  photo: 'Photo',
};

function many(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function presetFromCatalog(
  catalog: readonly ChatCatalogItem[],
  params: { pin?: string | string[]; route?: string | string[]; photo?: string | string[] },
): DraftItem[] {
  const out: DraftItem[] = [];
  const seen = new Set<string>();
  for (const kind of ['pin', 'route', 'photo'] as const) {
    for (const id of many(params[kind])) {
      if (!UUID.test(id)) continue;
      const key = `${kind}:${id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const found = catalog.find((item) => item.kind === kind && item.id === id);
      out.push({
        kind,
        id,
        label: found?.label ?? FALLBACK[kind],
        thumb: found?.thumb ?? null,
        photoUrl: found?.photoUrl ?? null,
        photoThumbUrl: found?.photoThumbUrl ?? null,
      });
    }
  }
  return out;
}
