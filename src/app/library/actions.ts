'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getViewer } from '@/app/sign-in/actions';
import { attachEntity, deletePhoto, deleteReport, deleteRoute, detachEntity, updateRouteTitle } from '@/lib/library';
import { cleanRouteNotes, cleanRouteTitle } from '@/lib/route-title';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { redirectToSignIn } from '@/lib/sign-in-redirect';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safePath(value: FormData, fallback: string): string {
  const raw = String(value.get('returnTo') ?? '');
  if (raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('://')) return raw;
  return fallback;
}

async function actor() {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT, viewer: null };
  return { error: null, viewer };
}

function kindOf(value: string): 'route' | 'pin' | 'photo' | null {
  if (value === 'route' || value === 'pin' || value === 'photo') return value;
  return null;
}

export async function attachToReportAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const who = await actor();
  if (!who.viewer) return { error: who.error ?? 'Sign in to do that.' };
  const kind = kindOf(String(formData.get('kind') ?? ''));
  const entityId = String(formData.get('entityId') ?? '');
  const reportId = String(formData.get('reportId') ?? '');
  if (!kind || !UUID.test(entityId) || !UUID.test(reportId)) return { error: 'Pick one of your trips.' };
  const result = await attachEntity({ actor: who.viewer, reportId, kind, entityId });
  if (result === 'taken') return { error: 'Detach it from the other trip first.' };
  if (result === 'forbidden') return { error: 'You can only attach your own things to your own trip.' };
  if (result === 'missing') return { error: 'That item is missing.' };
  revalidatePath(`/posts/${reportId}`);
  revalidatePath('/map');
  const back = safePath(formData, kind === 'route' ? `/routes/${entityId}` : kind === 'pin' ? `/pins/${entityId}` : `/photos/${entityId}`);
  redirect(back);
}

export async function detachFromReportAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const who = await actor();
  if (!who.viewer) return { error: who.error ?? 'Sign in to do that.' };
  const kind = kindOf(String(formData.get('kind') ?? ''));
  const entityId = String(formData.get('entityId') ?? '');
  if (!kind || !UUID.test(entityId)) return { error: 'That item is missing.' };
  const ok = await detachEntity({ actor: who.viewer, kind, entityId });
  if (!ok) return { error: 'You can only detach your own things.' };
  revalidatePath('/map');
  revalidatePath('/posts');
  redirect(safePath(formData, kind === 'route' ? `/routes/${entityId}` : kind === 'pin' ? `/pins/${entityId}` : `/photos/${entityId}`));
}

export async function updateRouteTitleAction(
  _prev: { error?: string; saved?: true } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: true }> {
  const who = await actor();
  if (!who.viewer) return { error: who.error ?? 'Sign in to edit a route.' };
  const id = String(formData.get('id') ?? '');
  if (!UUID.test(id)) return { error: 'That route is missing.' };
  const title = cleanRouteTitle(String(formData.get('title') ?? ''));
  const notes = cleanRouteNotes(String(formData.get('notes') ?? ''));
  const ok = await updateRouteTitle(id, title, notes, who.viewer);
  if (!ok) return { error: 'You can only edit your own routes.' };
  revalidatePath(`/routes/${id}`);
  revalidatePath('/map');
  return { saved: true };
}

export async function deleteRouteAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const who = await actor();
  if (!who.viewer) return { error: who.error ?? 'Sign in to delete a route.' };
  const id = String(formData.get('id') ?? '');
  if (!UUID.test(id)) return { error: 'That route is missing.' };
  const ok = await deleteRoute(id, who.viewer);
  if (!ok) return { error: 'You can only delete your own routes.' };
  revalidatePath('/map');
  redirect(safePath(formData, who.viewer.handle ? `/user/${who.viewer.handle}` : '/'));
}

export async function deletePhotoAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const who = await actor();
  if (!who.viewer) return { error: who.error ?? 'Sign in to delete a photo.' };
  const id = String(formData.get('id') ?? '');
  if (!UUID.test(id)) return { error: 'That photo is missing.' };
  const ok = await deletePhoto(id, who.viewer);
  if (!ok) return { error: 'You can only delete your own photos.' };
  revalidatePath('/map');
  redirect(safePath(formData, who.viewer.handle ? `/user/${who.viewer.handle}` : '/'));
}

export async function deleteReportAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const who = await actor();
  if (!who.viewer) return { error: who.error ?? 'Sign in to delete a trip.' };
  const id = String(formData.get('id') ?? '');
  const mode = String(formData.get('mode') ?? 'report') === 'all' ? 'all' : 'report';
  if (!UUID.test(id)) return { error: 'That trip is missing.' };
  const ok = await deleteReport(id, who.viewer, mode);
  if (!ok) return { error: 'You can only delete your own trips.' };
  revalidatePath('/posts');
  revalidatePath('/map');
  redirect(safePath(formData, '/trips'));
}
