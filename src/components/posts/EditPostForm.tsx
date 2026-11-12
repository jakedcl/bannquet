'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePostAction } from '@/app/posts/actions';
import { PostAttachmentsEditor } from '@/components/posts/PostAttachmentsEditor';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { adminPowerLabel } from '@/lib/admin-ui';
import type { ChatCatalogItem } from '@/lib/chat-view';
import type { DraftItem } from '@/lib/trip-draft';
import type { PostAttachment } from '@/lib/post-attachments';

function draftFromAttachments(items: PostAttachment[]): DraftItem[] {
  return items.map((item) => ({
    kind: item.kind,
    id: item.id,
    label: item.label,
    thumb: item.thumb,
    photoUrl: item.photoUrl,
    photoThumbUrl: item.photoThumbUrl,
  }));
}

export function EditPostForm({
  postId,
  title: initialTitle,
  body: initialBody,
  attachments: initialAttachments,
  viewerId,
  catalog,
  adminPower = false,
}: {
  postId: string;
  title: string;
  body: string;
  attachments: PostAttachment[];
  viewerId: string;
  catalog: ChatCatalogItem[];
  adminPower?: boolean;
}) {
  const saveAdmin = adminPower ? adminPowerLabel('Save changes') : null;
  const router = useRouter();
  const [state, action] = useActionState(updatePostAction, null);
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [attached, setAttached] = useState<DraftItem[]>(() => draftFromAttachments(initialAttachments));

  useEffect(() => {
    if (state?.saved) router.refresh();
  }, [router, state]);

  return (
    <form action={action} className="mt-3 space-y-4">
      <input type="hidden" name="id" value={postId} />
      <label className="block space-y-1">
        <span className="text-sm font-bold">Title</span>
        <input
          name="title"
          required
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full retro-box-inset bg-white px-3 py-2"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-bold">Body</span>
        <textarea
          name="body"
          rows={8}
          maxLength={8000}
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="w-full retro-box-inset bg-white px-3 py-2"
        />
      </label>
      <PostAttachmentsEditor
        viewerId={viewerId}
        catalog={catalog}
        attached={attached}
        onChange={setAttached}
      />
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      {state?.saved ? <p className="text-sm">Saved.</p> : null}
      <SubmitButton
        tone="yellow"
        pendingLabel="Saving…"
        title={saveAdmin?.title}
        ariaLabel={saveAdmin?.ariaLabel}
      >
        Save changes
      </SubmitButton>
    </form>
  );
}
