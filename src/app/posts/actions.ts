'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireContributor } from '@/lib/contributor';
import { cleanPostFields } from '@/lib/post-fields';
import { createPost, deletePost, updatePost } from '@/lib/feed-posts';
import { readAttachments } from '@/lib/post-attachments';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function contributor() {
  const who = await requireContributor();
  if (!who.ok) return { error: who.error, viewer: null };
  return { error: null, viewer: who.viewer };
}

export async function createPostAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const { error, viewer } = await contributor();
  if (!viewer) return { error: error ?? 'Sign in to add a post.' };
  const parsed = cleanPostFields({ title: formData.get('title'), body: formData.get('body') });
  if ('error' in parsed) return { error: parsed.error };
  const attachments = readAttachments(formData);
  let id = '';
  try {
    id = await createPost({
      userId: viewer.id,
      ...parsed.fields,
      attachments,
      admin: viewer.role === 'admin',
    });
  } catch {
    return { error: 'Could not save that post. Try again in a minute.' };
  }
  redirect(`/posts/${id}`);
}

export async function updatePostAction(
  _prev: { error?: string; saved?: true } | null,
  formData: FormData,
): Promise<{ error?: string; saved?: true }> {
  const { error, viewer } = await contributor();
  if (!viewer) return { error: error ?? 'Sign in to edit a post.' };
  const id = String(formData.get('id') ?? '');
  if (!UUID.test(id)) return { error: 'That post is missing.' };
  const parsed = cleanPostFields({ title: formData.get('title'), body: formData.get('body') });
  if ('error' in parsed) return { error: parsed.error };
  const attachments = readAttachments(formData);
  const ok = await updatePost({
    id,
    ...parsed.fields,
    attachments,
    actor: { id: viewer.id, admin: viewer.role === 'admin' },
  });
  if (!ok) return { error: 'You can only edit your own posts.' };
  revalidatePath(`/posts/${id}`);
  revalidatePath('/posts');
  return { saved: true };
}

export async function deletePostAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const { error, viewer } = await contributor();
  if (!viewer) return { error: error ?? 'Sign in to delete a post.' };
  const id = String(formData.get('id') ?? '');
  if (!UUID.test(id)) return { error: 'That post is missing.' };
  const ok = await deletePost(id, { id: viewer.id, admin: viewer.role === 'admin' });
  if (!ok) return { error: 'You can only delete a post you wrote.' };
  revalidatePath('/posts');
  redirect('/posts');
}
