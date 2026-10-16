'use server';

import { revalidatePath } from 'next/cache';
import { getViewer } from '@/app/sign-in/actions';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { redirectToSignIn } from '@/lib/sign-in-redirect';
import { deleteClimb, deleteLatestClimb, ensurePeaks, logClimb } from '@/lib/summits';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh(handle: string | null, peakSlug: string) {
  revalidatePath('/peaks');
  if (peakSlug) revalidatePath(`/peaks/${peakSlug}`);
  if (handle) {
    revalidatePath(`/user/${handle}`);
    revalidatePath(`/user/${handle}/climbs`);
  }
}

export async function logClimbAction(formData: FormData): Promise<void> {
  await recordClimb(formData);
}

/** One climb, only after the person confirms. The form stays pending until this returns. */
export async function confirmSummitAction(formData: FormData): Promise<{ ok: true } | { ok: false }> {
  return recordClimb(formData);
}

async function recordClimb(formData: FormData): Promise<{ ok: true } | { ok: false }> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { ok: false };
  const peakSlug = String(formData.get('peakSlug') ?? '').trim();
  if (!peakSlug) return { ok: false };
  await ensurePeaks();
  const result = await logClimb(viewer.id, peakSlug, null);
  if (result === 'missing') return { ok: false };
  refresh(viewer.handle, peakSlug);
  return { ok: true };
}

export async function removeLatestClimbAction(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return;
  const peakSlug = String(formData.get('peakSlug') ?? '').trim();
  if (!peakSlug) return;
  await deleteLatestClimb(viewer.id, peakSlug);
  refresh(viewer.handle, peakSlug);
}

export async function deleteClimbAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };
  const id = String(formData.get('id') ?? '');
  const peakSlug = String(formData.get('peakSlug') ?? '').trim();
  if (!UUID.test(id)) return { error: 'That climb is missing.' };
  const ok = await deleteClimb(id, { id: viewer.id, admin: viewer.role === 'admin' });
  if (!ok) return { error: 'You can only delete your own climbs.' };
  refresh(viewer.handle, peakSlug);
  return {};
}
