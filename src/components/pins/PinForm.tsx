'use client';

import { useActionState, useRef, useState } from 'react';
import { createPinAction, deletePinAction, updatePinAction } from '@/app/pins/actions';
import { PhotoFields } from '@/components/posts/PhotoFields';
import type { UploadedPhoto } from '@/components/posts/prepare-photo';
import { TrashButton } from '@/components/delete/ConfirmDelete';
import { Button } from '@/components/retro/Button';
import { ACTIVITIES, ACTIVITY_META, isActivity, mapColorForActivity } from '@/lib/activities';
import { PIN_KINDS, PIN_KIND_LABELS, type PinKind } from '@/lib/pin-kinds';
import type { MapFeatureCollection } from '@/lib/posts';
import dynamic from 'next/dynamic';

const GroupMap = dynamic(() => import('@/components/map/GroupMap'), { ssr: false });

const EMPTY: MapFeatureCollection = { type: 'FeatureCollection', features: [] };

type InitialPin = {
  id: string;
  title: string;
  note: string;
  activity: string;
  kind: PinKind;
  visitedOn: string;
  lat: number;
  lng: number;
  photos: Array<{ id: string; url: string }>;
};

export function PinForm({ initial }: { initial?: InitialPin }) {
  const action = initial ? updatePinAction : createPinAction;
  const [state, formAction, pending] = useActionState(action, null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [activity, setActivity] = useState(initial?.activity && isActivity(initial.activity) ? initial.activity : 'hike');
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(
    initial ? { lat: initial.lat, lng: initial.lng } : null,
  );
  const [locateError, setLocateError] = useState<string | null>(null);
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);
  const placed = useRef(Boolean(initial));
  const [focus] = useState(initial ? { lng: initial.lng, lat: initial.lat, zoom: 12 } : null);

  function place(lng: number, lat: number) {
    placed.current = true;
    setPoint({ lat, lng });
    setLocateError(null);
    if (latRef.current) latRef.current.value = String(lat);
    if (lngRef.current) lngRef.current.value = String(lng);
  }

  function onPhotos(next: UploadedPhoto[]) {
    setPhotos(next);
    if (placed.current) return;
    const hit = next.find((photo) => photo.lat != null && photo.lng != null);
    if (hit?.lat == null || hit.lng == null) return;
    place(hit.lng, hit.lat);
  }

  const draft: MapFeatureCollection = point
    ? {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
          properties: {
            kind: 'pin',
            draft: 1,
            title: 'Pin',
            who: '',
            date: null,
            activity,
            category: '',
            color: mapColorForActivity(activity),
            trackId: '',
            href: '',
          },
        }],
      }
    : EMPTY;

  const today = new Date().toISOString().slice(0, 10);
  const photoPoint = photos.find((photo) => photo.lat != null && photo.lng != null);

  return (
    <form action={formAction} className="space-y-4">
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <label className="block space-y-1">
        <span className="text-sm font-bold">Title</span>
        <input
          name="title"
          required
          maxLength={120}
          defaultValue={initial?.title ?? ''}
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-bold">Date</span>
          <input
            type="date"
            name="visitedOn"
            required
            defaultValue={initial?.visitedOn ?? today}
            className="w-full retro-box-inset bg-white px-3 py-2 text-base"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-bold">What were you doing?</span>
          <select
            name="activity"
            required
            value={activity}
            onChange={(event) => {
              if (isActivity(event.target.value)) setActivity(event.target.value);
            }}
            className="w-full retro-box-inset bg-white px-3 py-2 text-base"
          >
            {ACTIVITIES.map((item) => (
              <option key={item} value={item}>{ACTIVITY_META[item].label}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-sm font-bold">Category</span>
        <select
          name="kind"
          required
          defaultValue={initial?.kind ?? 'other'}
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        >
          {PIN_KINDS.map((kind) => (
            <option key={kind} value={kind}>{PIN_KIND_LABELS[kind]}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-bold">Note</span>
        <textarea
          name="note"
          rows={4}
          maxLength={2000}
          defaultValue={initial?.note ?? ''}
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        />
      </label>
      <div className="space-y-2">
        <p className="text-sm font-bold">Where</p>
        <p className="text-xs text-gray-600">
          Click the map, use your location, or add a photo that already has one.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="retro-button rounded-none px-3 py-1 text-xs font-bold uppercase"
            onClick={() => {
              if (!navigator.geolocation) {
                setLocateError('This browser cannot read your location.');
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (position) => place(position.coords.longitude, position.coords.latitude),
                () => setLocateError('Could not read your location. Drop the pin on the map instead.'),
                { enableHighAccuracy: true, timeout: 10000 },
              );
            }}
          >
            Use current location
          </button>
          {photoPoint?.lat != null && photoPoint.lng != null ? (
            <button
              type="button"
              className="retro-button rounded-none px-3 py-1 text-xs font-bold uppercase"
              onClick={() => place(photoPoint.lng as number, photoPoint.lat as number)}
            >
              Use the photo&apos;s location
            </button>
          ) : null}
        </div>
        {point ? (
          <p className="text-xs text-gray-700">Pin at {point.lat.toFixed(5)}, {point.lng.toFixed(5)}</p>
        ) : (
          <p className="text-xs text-gray-700">No spot chosen yet.</p>
        )}
        {locateError ? <p className="text-sm font-bold text-red-700">{locateError}</p> : null}
        <input type="hidden" name="lat" ref={latRef} defaultValue={initial ? String(initial.lat) : ''} />
        <input type="hidden" name="lng" ref={lngRef} defaultValue={initial ? String(initial.lng) : ''} />
        <div className="h-64 overflow-hidden retro-box">
          <GroupMap
            points={draft}
            lines={EMPTY}
            picking
            focus={focus}
            onPick={(lng, lat) => place(lng, lat)}
          />
        </div>
      </div>
      {initial && initial.photos.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold">Photos on this pin</legend>
          {initial.photos.map((photo) => (
            <label key={photo.id} className="flex items-center gap-3 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="h-12 w-12 object-cover" />
              <input type="checkbox" name="removePhoto" value={photo.id} />
              Remove
            </label>
          ))}
        </fieldset>
      ) : null}
      <PhotoFields photos={photos} onChange={onPhotos} onBusy={setPhotoBusy} requireLocation={false} />
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      <Button tone="green" type="submit" disabled={pending || photoBusy}>
        {photoBusy ? 'Preparing photo…' : pending ? 'Saving…' : initial ? 'Save pin' : 'Drop pin'}
      </Button>
    </form>
  );
}

export function DeletePinButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deletePinAction, null);
  return (
    <form
      action={action}
      className="relative shrink-0"
      onSubmit={(event) => {
        if (!window.confirm('Delete this pin?')) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {state?.error ? (
        <p className="absolute right-0 top-full z-10 mt-1 w-44 text-right text-xs font-bold text-red-700">{state.error}</p>
      ) : null}
      <TrashButton pending={pending} />
    </form>
  );
}
