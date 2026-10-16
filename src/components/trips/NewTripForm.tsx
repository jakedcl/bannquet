'use client';

import { useActionState, useRef, useState } from 'react';
import Image from 'next/image';
import { createTripAction } from '@/app/trips/actions';
import { PinForm } from '@/components/pins/PinForm';
import { PhotoUpload, RouteUpload } from '@/components/posts/ProfileAdds';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { AttachPicker, type AttachPickerHandle } from '@/components/trips/AttachPicker';
import type { ChatCatalogItem } from '@/lib/chat-view';
import type { DraftItem } from '@/lib/trip-draft';

const CREATE_LABEL = { pin: 'New pin', route: 'New route', photo: 'New photo' } as const;

function hrefFor(item: DraftItem): string {
  if (item.kind === 'pin') return `/pins/${item.id}`;
  if (item.kind === 'route') return `/routes/${item.id}`;
  return `/photos/${item.id}`;
}

export function NewTripForm({
  viewerId,
  catalog,
  preset,
}: {
  viewerId: string;
  catalog: ChatCatalogItem[];
  preset: DraftItem[];
}) {
  const [state, action] = useActionState(createTripAction, null);
  const [title, setTitle] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [notes, setNotes] = useState('');
  const [attached, setAttached] = useState<DraftItem[]>(preset);
  const [extra, setExtra] = useState<ChatCatalogItem[]>([]);
  const [createKind, setCreateKind] = useState<DraftItem['kind'] | null>(null);
  const [formKey, setFormKey] = useState(0);
  const pickerRef = useRef<AttachPickerHandle>(null);
  const createRef = useRef<HTMLDialogElement>(null);

  function addItems(items: DraftItem[], keepOpen = false) {
    setAttached((current) => {
      const seen = new Set(current.map((item) => `${item.kind}:${item.id}`));
      const next = [...current];
      for (const item of items) {
        const key = `${item.kind}:${item.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(item);
      }
      return next;
    });
    setExtra((current) => {
      const seen = new Set(current.map((item) => `${item.kind}:${item.id}`));
      const next = [...current];
      for (const item of items) {
        const key = `${item.kind}:${item.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        next.unshift({
          kind: item.kind,
          id: item.id,
          label: item.label,
          href: hrefFor(item),
          thumb: item.thumb,
          ownerId: viewerId,
          ownerName: '',
        });
      }
      return next;
    });
    if (!keepOpen) createRef.current?.close();
  }

  function openCreate(kind: DraftItem['kind']) {
    setCreateKind(kind);
    setFormKey((value) => value + 1);
    createRef.current?.showModal();
  }

  return (
    <>
      <form action={action} className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-bold">Title</span>
          <input
            name="title"
            required
            maxLength={80}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full retro-box-inset bg-white px-3 py-2"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-bold">Date</span>
          <input
            name="tripDate"
            type="date"
            required
            value={tripDate}
            onChange={(event) => setTripDate(event.target.value)}
            className="w-full retro-box-inset bg-white px-3 py-2"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-bold">Notes</span>
          <textarea
            name="notes"
            rows={5}
            maxLength={4000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="AllTrails link, where to meet, how it went"
            className="w-full retro-box-inset bg-white px-3 py-2"
          />
        </label>
        <div className="space-y-2">
          <p className="text-sm font-bold">Pins, routes, photos</p>
          {attached.length === 0 ? (
            <p className="text-sm text-gray-700">Nothing attached yet.</p>
          ) : (
            <ul className="space-y-1">
              {attached.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="flex items-center gap-2 text-sm">
                  <input type="hidden" name={item.kind} value={item.id} />
                  {item.thumb ? (
                    <Image src={item.thumb} alt="" width={32} height={32} className="h-8 w-8 shrink-0 object-cover" />
                  ) : (
                    <span className={`inline-block h-8 w-8 shrink-0 ${item.kind === 'pin' ? 'bg-[#c0392b]' : item.kind === 'route' ? 'bg-[#1f4e9c]' : 'bg-[#e67e22]'}`} aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-bold">{item.label}</span>
                  <button
                    type="button"
                    className="text-xs underline"
                    onClick={() => setAttached((current) => current.filter((row) => row.id !== item.id || row.kind !== item.kind))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="retro-button rounded-none px-3 py-1 text-xs font-bold uppercase" onClick={() => pickerRef.current?.open()}>
              Attach existing
            </button>
            <button type="button" className="retro-button rounded-none px-3 py-1 text-xs font-bold uppercase" onClick={() => openCreate('pin')}>
              + New pin
            </button>
            <button type="button" className="retro-button rounded-none px-3 py-1 text-xs font-bold uppercase" onClick={() => openCreate('route')}>
              + New route
            </button>
            <button type="button" className="retro-button rounded-none px-3 py-1 text-xs font-bold uppercase" onClick={() => openCreate('photo')}>
              + New photo
            </button>
          </div>
        </div>
        {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
        <SubmitButton tone="yellow" pendingLabel="Saving…">Save trip</SubmitButton>
      </form>
      <AttachPicker
        ref={pickerRef}
        catalog={[...extra, ...catalog]}
        viewerId={viewerId}
        onPick={(item) => addItems([{ kind: item.kind, id: item.id, label: item.label, thumb: item.thumb }])}
      />
      <dialog
        ref={createRef}
        aria-label={createKind ? CREATE_LABEL[createKind] : 'New'}
        className="m-auto w-[min(40rem,calc(100%-2rem))] max-h-[min(40rem,calc(100%-2rem))] overflow-y-auto border-4 border-[#5c3a1e] bg-beige p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop:bg-black/40"
        onClose={() => setCreateKind(null)}
        onClick={(event) => {
          if (event.target === createRef.current) createRef.current.close();
        }}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-bold uppercase">{createKind ? CREATE_LABEL[createKind] : 'New'}</p>
          <button type="button" aria-label="Close" className="text-lg font-bold leading-none" onClick={() => createRef.current?.close()}>
            ×
          </button>
        </div>
        {createKind === 'pin' ? <PinForm key={formKey} inline onCreated={addItems} /> : null}
        {createKind === 'route' ? <RouteUpload key={formKey} inline onCreated={addItems} /> : null}
        {createKind === 'photo' ? <PhotoUpload key={formKey} inline onCreated={addItems} /> : null}
      </dialog>
    </>
  );
}
