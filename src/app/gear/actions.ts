'use server';

import { revalidatePath } from 'next/cache';
import { getViewer } from '@/app/sign-in/actions';
import { addGearItem, adjustGearHold, deleteGearHold, deleteGearItem, setGearHold, updateGearItem } from '@/lib/gear';
import { APPROVAL_WAIT, canContribute, canDeleteOwned } from '@/lib/membership';
import { redirectToSignIn } from '@/lib/sign-in-redirect';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refreshGear(gearId?: string) {
  revalidatePath('/gear');
  if (gearId && UUID.test(gearId)) revalidatePath(`/gear/${gearId}`);
}

export async function addGearAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };
  const result = await addGearItem(
    String(formData.get('name') ?? ''),
    viewer.id,
    String(formData.get('category') ?? ''),
  );
  if (result === 'empty') return { error: 'Name the item.' };
  if (result === 'taken') return { error: 'That item is already on the list.' };
  revalidatePath('/gear');
  return {};
}

export async function changeHoldAction(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return;
  const gearId = String(formData.get('gearId') ?? '');
  const delta = Number(formData.get('delta'));
  if (!UUID.test(gearId) || (delta !== 1 && delta !== -1)) return;
  await adjustGearHold(gearId, viewer.id, delta);
  refreshGear(gearId);
}

export async function setHoldAction(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return;
  const gearId = String(formData.get('gearId') ?? '');
  const qty = Number(formData.get('qty'));
  if (!UUID.test(gearId) || !Number.isInteger(qty) || qty < 0 || qty > 99) return;
  await setGearHold(gearId, viewer.id, qty);
  refreshGear(gearId);
}

export async function updateGearItemAction(
  _prev: { error?: string; saved?: true } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: true }> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };
  const id = String(formData.get('id') ?? '');
  if (!UUID.test(id)) return { error: 'That item is missing.' };
  const result = await updateGearItem(
    id,
    { name: String(formData.get('name') ?? ''), category: String(formData.get('category') ?? '') },
    { id: viewer.id, admin: viewer.role === 'admin' },
  );
  if (result === 'empty') return { error: 'Name the item.' };
  if (result === 'taken') return { error: 'That item is already on the list.' };
  if (result === 'forbidden') return { error: 'You can only edit an item you added.' };
  refreshGear(id);
  return { saved: true };
}

export async function deleteGearItemAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };
  const id = String(formData.get('id') ?? '');
  if (!UUID.test(id)) return { error: 'That item is missing.' };
  const ok = await deleteGearItem(id, { id: viewer.id, admin: viewer.role === 'admin' });
  if (!ok) return { error: 'You can only remove an item you added.' };
  refreshGear(id);
  return {};
}

export async function deleteGearHoldAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };
  const gearId = String(formData.get('gearId') ?? '');
  const userId = String(formData.get('userId') ?? '');
  if (!UUID.test(gearId) || !userId) return { error: 'That mark is missing.' };
  if (!canDeleteOwned({ actorRole: viewer.role, actorId: viewer.id, ownerId: userId })) {
    return { error: 'You can only remove your own mark.' };
  }
  const ok = await deleteGearHold(gearId, userId, { id: viewer.id, admin: viewer.role === 'admin' });
  if (!ok) return { error: 'That mark is already gone.' };
  refreshGear(gearId);
  return {};
}
