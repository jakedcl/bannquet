'use server';

import { revalidatePath } from 'next/cache';
import { getViewer } from '@/app/sign-in/actions';
import { canContribute } from '@/lib/membership';
import { ensurePeaks, toggleManualSummit } from '@/lib/summits';

export async function toggleSummit(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer || !canContribute(viewer.role)) return;
  const peakSlug = String(formData.get('peakSlug') ?? '').trim();
  if (!peakSlug) return;
  await ensurePeaks();
  const result = await toggleManualSummit(viewer.id, peakSlug);
  if (result === 'missing') return;
  revalidatePath('/stats');
  if (viewer.handle) revalidatePath(`/user/${viewer.handle}`);
}
