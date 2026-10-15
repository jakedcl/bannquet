'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { sendChatAction } from '@/app/chat/actions';
import { formatChatTime, type ChatMessage, type ChatRefKind } from '@/lib/chat-view';

type SavedItem = { id: string; label: string; url?: string };

const KINDS: Array<{ id: ChatRefKind; label: string }> = [
  { id: 'pin', label: 'Pin' },
  { id: 'route', label: 'Route' },
  { id: 'photo', label: 'Photo' },
];

export function ChatRoom({
  initial,
  canSend,
  notice,
  items,
}: {
  initial: ChatMessage[];
  canSend: boolean;
  notice: string | null;
  items: { pins: SavedItem[]; routes: SavedItem[]; photos: SavedItem[] };
}) {
  const [messages, setMessages] = useState(initial);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | 'menu' | ChatRefKind>(null);
  const [attached, setAttached] = useState<SavedItem & { kind: ChatRefKind } | null>(null);
  const [state, action, pending] = useActionState(sendChatAction, null);
  const scroller = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const latest = useRef(initial.at(-1) ?? null);

  useEffect(() => {
    latest.current = messages.at(-1) ?? null;
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!state || state.error) return;
    formRef.current?.reset();
    setAttached(null);
    setPicker(null);
  }, [state]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const cursor = latest.current;
      const params = new URLSearchParams();
      if (cursor) {
        params.set('after', cursor.createdAt);
        params.set('afterId', cursor.id);
      }
      try {
        const response = await fetch(`/api/chat?${params.toString()}`, { cache: 'no-store' });
        if (!response.ok) {
          setRefreshNote('Chat did not refresh.');
          return;
        }
        const data = await response.json() as { messages?: ChatMessage[] };
        const next = Array.isArray(data.messages) ? data.messages : [];
        if (next.length === 0) return;
        setRefreshNote(null);
        setMessages((current) => {
          const seen = new Set(current.map((message) => message.id));
          return [...current, ...next.filter((message) => !seen.has(message.id))];
        });
      } catch {
        setRefreshNote('Chat did not refresh.');
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const list = picker === 'pin' ? items.pins : picker === 'route' ? items.routes : picker === 'photo' ? items.photos : [];

  return (
    <div className="space-y-3">
      <div ref={scroller} className="max-h-[28rem] space-y-3 overflow-y-auto bg-beige p-3 retro-box-inset">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-700">No messages yet. Say what you are up to.</p>
        ) : messages.map((message) => (
          <article key={message.id} className="text-sm">
            <p>
              {message.handle ? (
                <Link href={`/user/${message.handle}`} className="font-bold underline">{message.name}</Link>
              ) : (
                <span className="font-bold">{message.name}</span>
              )}
              <span className="ml-2 text-xs text-gray-500">{formatChatTime(message.createdAt)}</span>
            </p>
            {message.body ? <p className="mt-1 whitespace-pre-wrap">{message.body}</p> : null}
            {message.ref ? <Chip refItem={message.ref} /> : null}
          </article>
        ))}
      </div>
      {refreshNote ? <p className="text-xs font-bold">{refreshNote}</p> : null}
      {notice ? <p className="text-sm font-bold">{notice}</p> : null}
      <form ref={formRef} action={action} className="space-y-2">
        <input type="hidden" name="refKind" value={attached?.kind ?? ''} />
        <input type="hidden" name="refId" value={attached?.id ?? ''} />
        {attached ? (
          <p className="flex items-center gap-2 text-sm">
            <Chip refItem={{ kind: attached.kind, label: attached.label, href: '#', thumb: attached.url ?? null, missing: false }} />
            <button type="button" className="text-xs underline" onClick={() => setAttached(null)}>Remove</button>
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <div className="relative">
            <button
              type="button"
              aria-label="Attach a pin, route, or photo"
              aria-expanded={picker != null}
              disabled={!canSend}
              onClick={() => setPicker((current) => (current ? null : 'menu'))}
              className="retro-button-blue nav-button w-10 rounded-none px-0 text-lg"
            >
              @
            </button>
            {picker ? (
              <div className="absolute bottom-full left-0 z-20 mb-1 w-56 bg-[#5c3a1e] p-1">
                {picker === 'menu' ? (
                  <div className="flex flex-col gap-1">
                    {KINDS.map((kind) => (
                      <button
                        key={kind.id}
                        type="button"
                        className="retro-button-yellow rounded-none px-3 py-1 text-left text-xs font-bold uppercase"
                        onClick={() => setPicker(kind.id)}
                      >
                        {kind.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1 bg-beige p-2">
                    <button type="button" className="text-xs font-bold uppercase underline" onClick={() => setPicker('menu')}>
                      Back
                    </button>
                    {list.length === 0 ? (
                      <p className="text-sm">Nothing saved here yet.</p>
                    ) : (
                      <ul className="max-h-48 space-y-1 overflow-y-auto">
                        {list.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 text-left text-sm underline"
                              onClick={() => {
                                setAttached({ ...item, kind: picker });
                                setPicker(null);
                              }}
                            >
                              {picker === 'photo' && item.url ? (
                                <Image src={item.url} alt="" width={32} height={32} className="h-8 w-8 object-cover" />
                              ) : null}
                              {item.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Message</span>
            <textarea
              name="body"
              rows={2}
              maxLength={500}
              disabled={!canSend || pending}
              placeholder="A note for the group"
              className="w-full retro-box-inset bg-white px-3 py-2 text-sm"
            />
          </label>
          <button type="submit" disabled={!canSend || pending} className="retro-button-yellow rounded-none px-3 py-2 text-xs font-bold uppercase disabled:opacity-60">
            {pending ? 'Sending…' : 'Send'}
          </button>
        </div>
        {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      </form>
    </div>
  );
}

function Chip({ refItem }: { refItem: { kind: string; label: string; href: string; thumb: string | null; missing: boolean } }) {
  if (refItem.missing) {
    return <span className="mt-1 inline-block text-xs text-gray-500">That {refItem.kind} is gone.</span>;
  }
  return (
    <Link href={refItem.href} className="mt-1 inline-flex items-center gap-2 border border-gray-400 bg-white px-2 py-1 text-xs font-bold">
      {refItem.thumb ? <Image src={refItem.thumb} alt="" width={28} height={28} className="h-7 w-7 object-cover" /> : null}
      {refItem.label}
    </Link>
  );
}
