import { sql } from 'drizzle-orm';
import { getDb } from '@/db';

type QueryRows = { rows?: Record<string, unknown>[] };

function asRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  return (result as QueryRows).rows ?? [];
}

function text(value: unknown): string | null {
  if (value == null) return null;
  const next = String(value);
  return next.length > 0 ? next : null;
}

export type GearHold = {
  userId: string;
  name: string;
  handle: string | null;
  qty: number;
};

export type GearItem = {
  id: string;
  name: string;
  holds: GearHold[];
};

export async function listGear(): Promise<GearItem[]> {
  const [items, holds] = await Promise.all([
    getDb().execute(sql`
      select id::text as id, name
      from community_gear
      order by lower(name)
    `),
    getDb().execute(sql`
      select h.gear_id::text as gear_id, h.user_id, h.qty,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Friend') as name,
        u.handle
      from community_gear_holds h
      join users u on u.id = h.user_id
      where u.role <> 'pending' and h.qty > 0
      order by name
    `),
  ]);
  const byItem = new Map<string, GearHold[]>();
  for (const row of asRows(holds)) {
    const gearId = text(row.gear_id);
    const userId = text(row.user_id);
    const qty = Number(row.qty);
    if (!gearId || !userId || !Number.isFinite(qty) || qty < 1) continue;
    const list = byItem.get(gearId) ?? [];
    list.push({
      userId,
      name: text(row.name) ?? 'Friend',
      handle: text(row.handle),
      qty,
    });
    byItem.set(gearId, list);
  }
  return asRows(items).flatMap((row) => {
    const id = text(row.id);
    const name = text(row.name);
    if (!id || !name) return [];
    return [{ id, name, holds: byItem.get(id) ?? [] }];
  });
}

export async function addGearItem(name: string, userId: string): Promise<'ok' | 'taken' | 'empty'> {
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (clean.length < 2) return 'empty';
  try {
    await getDb().execute(sql`
      insert into community_gear (name, added_by)
      values (${clean}, ${userId})
    `);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.toLowerCase().includes('duplicate') || message.includes('community_gear_name_idx')) return 'taken';
    throw err;
  }
  return 'ok';
}

export async function setGearHold(gearId: string, userId: string, qty: number): Promise<void> {
  if (qty < 1) {
    await getDb().execute(sql`
      delete from community_gear_holds
      where gear_id = ${gearId}::uuid and user_id = ${userId}
    `);
    return;
  }
  await getDb().execute(sql`
    insert into community_gear_holds (gear_id, user_id, qty)
    values (${gearId}::uuid, ${userId}, ${qty})
    on conflict (gear_id, user_id) do update set qty = ${qty}
  `);
}
