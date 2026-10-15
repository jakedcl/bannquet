'use server';

import { revalidatePath } from 'next/cache';
import { getViewer } from '@/app/sign-in/actions';
import { isChatRefKind, sendChatMessage } from '@/lib/chat';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function sendChatAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: 'Sign in to talk.' };
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };
  const body = String(formData.get('body') ?? '');
  const kindRaw = String(formData.get('refKind') ?? '').trim();
  const refId = String(formData.get('refId') ?? '').trim();
  const refKind = kindRaw && isChatRefKind(kindRaw) ? kindRaw : null;
  if ((kindRaw && !refKind) || (refId && !UUID.test(refId)) || (refKind && !refId) || (!refKind && refId)) {
    return { error: 'That attachment is not one of yours.' };
  }
  const result = await sendChatMessage({
    userId: viewer.id,
    body,
    refKind,
    refId: refId || null,
  });
  if (result === 'empty') return { error: 'Write a note, or attach something you saved.' };
  if (result === 'missing') return { error: 'That attachment is not one of yours.' };
  revalidatePath('/chat');
  return {};
}
