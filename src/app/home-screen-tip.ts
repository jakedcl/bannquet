'use server';

import { sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/db';
import { getViewer } from '@/app/sign-in/actions';

export async function markHomeScreenTipSeen(): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: 'Sign in first.' };
  await getDb().execute(sql`
    update users
    set home_screen_tip_seen_at = now()
    where id = ${viewer.id} and home_screen_tip_seen_at is null
  `);
  revalidatePath('/', 'layout');
  return {};
}
