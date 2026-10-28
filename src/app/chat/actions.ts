'use server';

import { revalidatePath } from 'next/cache';
import { getViewer } from '@/app/sign-in/actions';
import { deleteChatMessage, isChatRefKind, listChatMessages, sendChatMessage, type ChatMessage } from '@/lib/chat';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { redirectToSignIn } from '@/lib/sign-in-redirect';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** On success, returns the messages after the sender's last one, so the new one shows right away. */
export async function sendChatAction(
  _prev: { error?: string; messages?: ChatMessage[] } | null,
  formData: FormData,
): Promise<{ error?: string; messages?: ChatMessage[] }> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };
  const body = String(formData.get('body') ?? '');
  const kindRaw = String(formData.get('refKind') ?? '').trim();
  const refId = String(formData.get('refId') ?? '').trim();
  const refKind = kindRaw && isChatRefKind(kindRaw) ? kindRaw : null;
  if ((kindRaw && !refKind) || (refId && !UUID.test(refId)) || (refKind && !refId) || (!refKind && refId)) {
    return { error: 'That attachment is missing.' };
  }
  const result = await sendChatMessage({
    userId: viewer.id,
    body,
    refKind,
    refId: refId || null,
  });
  if (result === 'empty') return { error: 'Write a note, or attach a pin, route, or photo.' };
  if (result === 'missing') return { error: 'That attachment is missing.' };
  revalidatePath('/chat');
  const after = String(formData.get('after') ?? '');
  const afterId = String(formData.get('afterId') ?? '');
  const cursor = after && UUID.test(afterId) && !Number.isNaN(Date.parse(after)) ? { after, afterId } : null;
  try {
    return { messages: await listChatMessages(cursor) };
  } catch {
    return {};
  }
}

export async function deleteChatAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return redirectToSignIn();
  if (!canContribute(viewer.role)) return { error: APPROVAL_WAIT };
  const id = String(formData.get('id') ?? '');
  if (!UUID.test(id)) return { error: 'That message is missing.' };
  const ok = await deleteChatMessage(id, { id: viewer.id, admin: viewer.role === 'admin' });
  if (!ok) return { error: 'You can only delete your own messages.' };
  revalidatePath('/chat');
  return {};
}
