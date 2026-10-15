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
  category: string | null;
  addedBy: string | null;
  holds: GearHold[];
};

export async function listGear(): Promise<GearItem[]> {
  const [items, holds] = await Promise.all([
    getDb().execute(sql`
      select id::text as id, name, category, added_by
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
    return [{ id, name, category: text(row.category), addedBy: text(row.added_by), holds: byItem.get(id) ?? [] }];
  });
}

export async function addGearItem(name: string, userId: string, category = ''): Promise<'ok' | 'taken' | 'empty'> {
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (clean.length < 2) return 'empty';
  const cleanCategory = category.trim().replace(/\s+/g, ' ').slice(0, 40);
  const stored = cleanCategory.length > 0 ? cleanCategory : null;
  try {
    await getDb().execute(sql`
      insert into community_gear (name, added_by, category)
      values (${clean}, ${userId}, ${stored})
    `);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.toLowerCase().includes('duplicate') || message.includes('community_gear_name_idx')) return 'taken';
    throw err;
  }
  return 'ok';
}

export async function deleteGearItem(id: string, actor: { id: string; admin: boolean }): Promise<boolean> {
  const result = await getDb().execute(sql`
    delete from community_gear
    where id = ${id}::uuid and (${actor.admin} or added_by = ${actor.id})
    returning id::text as id
  `);
  return asRows(result).length > 0;
}

export async function deleteGearHold(gearId: string, ownerId: string, actor: { id: string; admin: boolean }): Promise<boolean> {
  if (!actor.admin && actor.id !== ownerId) return false;
  const result = await getDb().execute(sql`
    delete from community_gear_holds
    where gear_id = ${gearId}::uuid and user_id = ${ownerId}
    returning gear_id::text as id
  `);
  return asRows(result).length > 0;
}

export async function adjustGearHold(gearId: string, userId: string, delta: 1 | -1): Promise<void> {
  if (delta === 1) {
    await getDb().execute(sql`
      insert into community_gear_holds (gear_id, user_id, qty)
      values (${gearId}::uuid, ${userId}, 1)
      on conflict (gear_id, user_id) do update
      set qty = least(99, community_gear_holds.qty + 1)
    `);
    return;
  }
  await getDb().execute(sql`
    delete from community_gear_holds
    where gear_id = ${gearId}::uuid and user_id = ${userId} and qty <= 1
  `);
  await getDb().execute(sql`
    update community_gear_holds
    set qty = qty - 1
    where gear_id = ${gearId}::uuid and user_id = ${userId} and qty > 1
  `);
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
