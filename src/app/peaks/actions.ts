'use server';

import { revalidatePath } from 'next/cache';
import { getViewer } from '@/app/sign-in/actions';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { deleteClimb, ensurePeaks, logClimb } from '@/lib/summits';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function refresh(handle: string | null, peakSlug: string) {
  revalidatePath('/peaks');
  if (peakSlug) revalidatePath(`/peaks/${peakSlug}`);
  if (handle) revalidatePath(`/user/${handle}`);
}

export async function logClimbAction(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer || !canContribute(viewer.role)) return;
  const peakSlug = String(formData.get('peakSlug') ?? '').trim();
  if (!peakSlug) return;
  const raw = String(formData.get('climbedOn') ?? '').trim();
  if (raw && !isRealDate(raw)) return;
  await ensurePeaks();
  const result = await logClimb(viewer.id, peakSlug, raw || null);
  if (result === 'missing') return;
  refresh(viewer.handle, peakSlug);
}

export async function deleteClimbAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: 'Sign in to delete a climb.' };
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };
  const id = String(formData.get('id') ?? '');
  const peakSlug = String(formData.get('peakSlug') ?? '').trim();
  if (!UUID.test(id)) return { error: 'That climb is missing.' };
  const ok = await deleteClimb(id, { id: viewer.id, admin: viewer.role === 'admin' });
  if (!ok) return { error: 'You can only delete your own climbs.' };
  refresh(viewer.handle, peakSlug);
  return {};
}
