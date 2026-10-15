'use server';

import { revalidatePath } from 'next/cache';
import { getViewer } from '@/app/sign-in/actions';
import { addGearItem, setGearHold } from '@/lib/gear';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function addGearAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: 'Sign in to add gear.' };
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };
  const result = await addGearItem(String(formData.get('name') ?? ''), viewer.id);
  if (result === 'empty') return { error: 'Name the item.' };
  if (result === 'taken') return { error: 'That item is already on the list.' };
  revalidatePath('/gear');
  return {};
}

export async function setHoldAction(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer || !canContribute(viewer.role)) return;
  const gearId = String(formData.get('gearId') ?? '');
  const qty = Number(formData.get('qty'));
  if (!UUID.test(gearId) || !Number.isInteger(qty) || qty < 0 || qty > 99) return;
  await setGearHold(gearId, viewer.id, qty);
  revalidatePath('/gear');
}
