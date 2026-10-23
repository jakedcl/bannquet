'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { draftPhotoSources, SmallPhotoImage } from '@/components/ui/SmallPhotoImage';
import { SearchBar } from '@/components/ui/SearchBar';
import type { ChatCatalogItem, ChatRefKind } from '@/lib/chat-view';

const GROUPS: Array<{ id: ChatRefKind; label: string }> = [
  { id: 'pin', label: 'Pins' },
  { id: 'route', label: 'Routes' },
  { id: 'photo', label: 'Photos' },
];

export type AttachPickerHandle = { open: () => void };

export const AttachPicker = forwardRef<AttachPickerHandle, {
  catalog: ChatCatalogItem[];
  viewerId: string;
  onPick: (item: ChatCatalogItem) => void;
}>(function AttachPicker({ catalog, viewerId, onPick }, ref) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [tab, setTab] = useState<'mine' | 'everyone'>('mine');
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const visible = catalog.filter((item) => {
    if (tab === 'mine' && item.ownerId !== viewerId) return false;
    if (needle && !`${item.label} ${item.ownerName}`.toLowerCase().includes(needle)) return false;
    return true;
  });

  useImperativeHandle(ref, () => ({
    open() {
      setTab('mine');
      setQuery('');
      dialogRef.current?.showModal();
    },
  }));

  return (
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
                        onPick(item);
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
  );
});

function Thumb({ item }: { item: ChatCatalogItem }) {
  const photo = draftPhotoSources(item);
  if (photo) {
    return (
      <SmallPhotoImage
        url={photo.url}
        thumbUrl={photo.thumbUrl}
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 object-cover"
      />
    );
  }
  const color = item.kind === 'pin' ? 'bg-[#c0392b]' : item.kind === 'route' ? 'bg-[#1f4e9c]' : 'bg-[#e67e22]';
  return <span className={`inline-block h-8 w-8 shrink-0 ${color}`} aria-hidden="true" />;
}
