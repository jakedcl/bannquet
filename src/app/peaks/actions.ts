'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { getViewer } from '@/app/sign-in/actions';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { redirectToSignIn } from '@/lib/sign-in-redirect';
import { addPeak, deletePeakRow, ensurePeaks, PEAKS_TAG, removePeak } from '@/lib/summits';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh(handle: string | null, peakSlug: string) {
  updateTag(PEAKS_TAG);
  revalidatePath('/peaks');
  if (peakSlug) revalidatePath(`/peaks/${peakSlug}`);
  if (handle) {
    revalidatePath(`/user/${handle}`);
    revalidatePath(`/user/${handle}/peaks`);
  }
}

type PeakActionState = { error?: string } | null;

export async function addPeakAction(
  _prev: PeakActionState,
  formData: FormData,
): Promise<PeakActionState> {
  return recordPeak(formData);
}

/** Add one suggested peak, only after the person taps Add. The form stays pending until this returns. */
export async function confirmPeakAction(formData: FormData): Promise<{ ok: true } | { ok: false }> {
  const result = await recordPeak(formData);
  return result?.error ? { ok: false } : { ok: true };
}

async function recordPeak(formData: FormData): Promise<PeakActionState> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };
  const peakSlug = String(formData.get('peakSlug') ?? '').trim();
  if (!peakSlug) return { error: 'That peak is missing.' };
  await ensurePeaks();
  const result = await addPeak(viewer.id, peakSlug);
  if (result === 'missing') return { error: 'That peak is missing.' };
  refresh(viewer.handle, peakSlug);
  return {};
}

export async function removePeakAction(
  _prev: PeakActionState,
  formData: FormData,
): Promise<PeakActionState> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };
  const peakSlug = String(formData.get('peakSlug') ?? '').trim();
  if (!peakSlug) return { error: 'That peak is missing.' };
  const removed = await removePeak(viewer.id, peakSlug);
  if (!removed) return { error: 'That visit is already gone.' };
  refresh(viewer.handle, peakSlug);
  return {};
}

export async function deletePeakRowAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };
  const id = String(formData.get('id') ?? '');
  const peakSlug = String(formData.get('peakSlug') ?? '').trim();
  if (!UUID.test(id)) return { error: 'That peak is missing.' };
  const ok = await deletePeakRow(id, { id: viewer.id, admin: viewer.role === 'admin' });
  if (!ok) return { error: 'You can only remove your own peaks.' };
  refresh(viewer.handle, peakSlug);
  revalidatePath('/user', 'layout');
  return {};
}
