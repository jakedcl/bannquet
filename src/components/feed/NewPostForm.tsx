'use client';

import { useActionState, useState } from 'react';
import { createPostAction } from '@/app/posts/actions';
import { PostAttachmentsEditor } from '@/components/posts/PostAttachmentsEditor';
import { SubmitButton } from '@/components/ui/SubmitButton';
import type { ChatCatalogItem } from '@/lib/chat-view';
import type { DraftItem } from '@/lib/trip-draft';

export function NewPostForm({
  viewerId,
  catalog,
  preset,
}: {
  viewerId: string;
  catalog: ChatCatalogItem[];
  preset: DraftItem[];
}) {
  const [state, action] = useActionState(createPostAction, null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [attached, setAttached] = useState<DraftItem[]>(preset);

  return (
    <form action={action} className="space-y-4">
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
          placeholder="What happened, where you went, links worth saving"
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
      <SubmitButton tone="yellow" pendingLabel="Saving…">Save post</SubmitButton>
    </form>
  );
}
