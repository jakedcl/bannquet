'use client';

import { useActionState, useState } from 'react';
import { createPostAction } from '@/app/posts/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function NewPostForm() {
  const [state, action] = useActionState(createPostAction, null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

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
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      <SubmitButton tone="yellow" pendingLabel="Saving…">Save post</SubmitButton>
    </form>
  );
}
