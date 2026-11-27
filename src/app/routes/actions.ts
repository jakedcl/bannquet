'use server';

import { revalidatePath } from 'next/cache';
import { requireContributor } from '@/lib/contributor';
import { addManualPhotoRouteLink, removePhotoRouteLink } from '@/lib/photo-route-links';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function toggleRoutePhotoLinkAction(
  _prev: { error?: string; saved?: true } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: true }> {
  const who = await requireContributor();
  if (!who.ok) return { error: who.error ?? 'Sign in to edit links.' };
  const trackId = String(formData.get('trackId') ?? '');
  const toggle = String(formData.get('toggle') ?? '');
  const [mode, photoId] = toggle.split(':');
  if (!UUID.test(trackId) || !UUID.test(photoId ?? '')) return { error: 'That link is missing.' };
  const unlink = mode === 'unlink';
  const ok = unlink
    ? await removePhotoRouteLink(trackId, photoId!, who.viewer)
    : await addManualPhotoRouteLink(trackId, photoId!, who.viewer);
  if (!ok) return { error: 'You can only edit your own routes and photos.' };
  revalidatePath(`/routes/${trackId}`);
  revalidatePath('/map');
  return { saved: true };
}