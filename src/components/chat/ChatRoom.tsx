'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { deleteChatAction, sendChatAction } from '@/app/chat/actions';
import { SearchBar } from '@/components/ui/SearchBar';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { formatChatTime, type ChatCatalogItem, type ChatMessage, type ChatRefKind } from '@/lib/chat-view';

const GROUPS: Array<{ id: ChatRefKind; label: string }> = [
  { id: 'pin', label: 'Pins' },
  { id: 'route', label: 'Routes' },
  { id: 'photo', label: 'Photos' },
];

export function ChatRoom({
  initial,
  canSend,
  notice,
  catalog,
  viewerId,
  moderator,
}: {
  initial: ChatMessage[];
  canSend: boolean;
  notice: string | null;
  catalog: ChatCatalogItem[];
  viewerId: string | null;
  moderator: boolean;
}) {
  const [messages, setMessages] = useState(initial);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  const [attached, setAttached] = useState<ChatCatalogItem | null>(null);
  const [tab, setTab] = useState<'mine' | 'everyone'>('mine');
  const [query, setQuery] = useState('');
  const dialogRef = useRef<HTMLDialogElement | null>(null);
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
    dialogRef.current?.close();
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

  const needle = query.trim().toLowerCase();
  const visible = catalog.filter((item) => {
    if (tab === 'mine' && item.ownerId !== viewerId) return false;
    if (needle && !`${item.label} ${item.ownerName}`.toLowerCase().includes(needle)) return false;
    return true;
  });

  function openPicker() {
    setTab('mine');
    setQuery('');
    dialogRef.current?.showModal();
  }

  return (
    <div className="space-y-3">
      <div ref={scroller} className="max-h-[28rem] space-y-3 overflow-y-auto bg-beige p-3 retro-box-inset">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-700">No messages yet. Say what you are up to.</p>
        ) : messages.map((message) => (
          <ChatLine
            key={message.id}
            message={message}
            canManage={moderator || (viewerId != null && message.userId === viewerId)}
            onRemove={() => setMessages((current) => current.filter((item) => item.id !== message.id))}
          />
        ))}
      </div>
      {refreshNote ? <p className="text-xs font-bold">{refreshNote}</p> : null}
      {notice ? <p className="text-sm font-bold">{notice}</p> : null}
      <form ref={formRef} action={action} className="space-y-2">
        <input type="hidden" name="refKind" value={attached?.kind ?? ''} />
        <input type="hidden" name="refId" value={attached?.id ?? ''} />
        {attached ? (
          <p className="flex items-center gap-2 text-sm">
            <Chip refItem={{ kind: attached.kind, label: attached.label, href: attached.href, thumb: attached.thumb, missing: false }} />
            <button type="button" className="text-xs underline" onClick={() => setAttached(null)}>Remove</button>
          </p>
        ) : null}
        <div className="composer-row">
          <button
            type="button"
            aria-label="Attach a pin, route, or photo"
            disabled={!canSend}
            onClick={openPicker}
            className="composer-control retro-button-blue w-10 shrink-0 rounded-none p-0 text-lg leading-none"
          >
            @
          </button>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Message</span>
            <textarea
              name="body"
              rows={1}
              maxLength={500}
              disabled={!canSend || pending}
              placeholder="A note for the group"
              className="composer-field w-full bg-white px-3 text-sm retro-box-inset"
            />
          </label>
          <SubmitButton tone="yellow" pendingLabel="Sending…" disabled={!canSend} className="composer-control shrink-0 px-3 py-0 text-xs">
            Send
          </SubmitButton>
        </div>
        {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      </form>
      <dialog
        ref={dialogRef}
        aria-label="Attach a pin, route, or photo"
        className="m-auto w-[min(32rem,calc(100%-2rem))] max-h-[min(36rem,calc(100%-2rem))] border-4 border-[#5c3a1e] bg-beige p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop:bg-black/40"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current.close();
        }}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-bold uppercase">Attach</p>
          <button type="button" aria-label="Close" className="text-lg font-bold leading-none" onClick={() => dialogRef.current?.close()}>
            ×
          </button>
        </div>
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            className={`${tab === 'mine' ? 'retro-button-yellow' : 'retro-button'} rounded-none px-3 py-1 text-xs font-bold uppercase`}
            onClick={() => setTab('mine')}
          >
            Mine
          </button>
          <button
            type="button"
            className={`${tab === 'everyone' ? 'retro-button-yellow' : 'retro-button'} rounded-none px-3 py-1 text-xs font-bold uppercase`}
            onClick={() => setTab('everyone')}
          >
            Everyone
          </button>
        </div>
        <SearchBar value={query} onChange={setQuery} placeholder="Search pins, routes, photos" label="Search attachments" />
        <div className="mt-3 max-h-72 space-y-3 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="text-sm">{tab === 'mine' ? 'Nothing of yours yet.' : 'Nothing saved here yet.'}</p>
          ) : GROUPS.map((group) => {
            const items = visible.filter((item) => item.kind === group.id);
            if (items.length === 0) return null;
            return (
              <section key={group.id}>
                <h3 className="text-xs font-bold uppercase tracking-wide">{group.label}</h3>
                <ul className="mt-1 space-y-1">
                  {items.map((item) => (
                    <li key={`${item.kind}-${item.id}`}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 py-1 text-left text-sm"
                        onClick={() => {
                          setAttached(item);
                          dialogRef.current?.close();
                        }}
                      >
                        <Thumb item={item} />
                        <span className="min-w-0">
                          <span className="block truncate font-bold underline">{item.label}</span>
                          {tab === 'everyone' ? <span className="block truncate text-xs text-gray-600">{item.ownerName}</span> : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </dialog>
    </div>
  );
}

function Thumb({ item }: { item: ChatCatalogItem }) {
  if (item.kind === 'photo' && item.thumb) {
    return <Image src={item.thumb} alt="" width={32} height={32} className="h-8 w-8 shrink-0 object-cover" />;
  }
  const color = item.kind === 'pin' ? 'bg-[#c0392b]' : item.kind === 'route' ? 'bg-[#1f4e9c]' : 'bg-[#e67e22]';
  return <span className={`inline-block h-8 w-8 shrink-0 ${color}`} aria-hidden="true" />;
}

function ChatLine({
  message,
  canManage,
  onRemove,
}: {
  message: ChatMessage;
  canManage: boolean;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hold = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-chat-menu]')) return;
      setOpen(false);
    }
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  function clearHold() {
    if (hold.current != null) window.clearTimeout(hold.current);
    hold.current = null;
    origin.current = null;
  }

  return (
    <article
      className={`group relative text-sm ${canManage ? 'pr-8' : ''}`}
      onContextMenu={(event) => {
        if (!canManage) return;
        event.preventDefault();
        setOpen(true);
      }}
      onPointerDown={(event) => {
        if (!canManage || event.pointerType === 'mouse') return;
        origin.current = { x: event.clientX, y: event.clientY };
        hold.current = window.setTimeout(() => setOpen(true), 500);
      }}
      onPointerMove={(event) => {
        if (!origin.current) return;
        const dx = event.clientX - origin.current.x;
        const dy = event.clientY - origin.current.y;
        if (dx * dx + dy * dy > 64) clearHold();
      }}
      onPointerUp={clearHold}
      onPointerCancel={clearHold}
    >
      <p className="truncate">
        {message.handle ? (
          <Link href={`/user/${message.handle}`} className="font-bold underline">{message.name}</Link>
        ) : (
          <span className="font-bold">{message.name}</span>
        )}
        <span className="ml-2 text-xs text-gray-500">{formatChatTime(message.createdAt)}</span>
      </p>
      {message.body ? <p className="mt-1 whitespace-pre-wrap">{message.body}</p> : null}
      {message.ref ? <Chip refItem={message.ref} /> : null}
      {error ? <p className="text-xs font-bold text-red-700">{error}</p> : null}
      {canManage ? (
        <div data-chat-menu className="absolute right-0 top-0">
          <button
            type="button"
            aria-label="Message actions"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="flex h-7 w-7 items-center justify-center text-lg font-bold leading-none text-[#5c3a1e] opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            ⋯
          </button>
          {open ? (
            <form
              className="absolute right-0 top-7 z-20 bg-[#5c3a1e] p-1"
              action={async (formData) => {
                const result = await deleteChatAction(null, formData);
                if (result?.error) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
                onRemove();
              }}
              onSubmit={(event) => {
                if (!window.confirm('Delete this message?')) event.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={message.id} />
              <SubmitButton tone="yellow" pendingLabel="Deleting…" className="px-3 py-1 text-xs">
                Delete
              </SubmitButton>
            </form>
          ) : null}
        </div>
      ) : null}
    </article>
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
