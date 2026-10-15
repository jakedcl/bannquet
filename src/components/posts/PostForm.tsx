'use client';

import dynamic from 'next/dynamic';
import { useActionState, useState } from 'react';
import { publishPost, savePostEdits } from '@/app/trip-reports/actions';
import { PhotoFields } from '@/components/posts/PhotoFields';
import type { UploadedPhoto } from '@/components/posts/prepare-photo';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { ACTIVITIES, ACTIVITY_META, isActivity } from '@/lib/activities';
import { formatFeetGain, formatMiles, packTrack } from '@/lib/gpx';
import { PIN_KINDS, PIN_KIND_LABELS } from '@/lib/pin-kinds';
import type { AttachChoice } from '@/lib/library';
import type { MapFeatureCollection } from '@/lib/posts';
import type { PostKind } from '@/lib/post-kinds';

const GroupMap = dynamic(() => import('@/components/map/GroupMap'), {
  ssr: false,
  loading: () => <p className="text-sm">Loading the map…</p>,
});

const EMPTY: MapFeatureCollection = { type: 'FeatureCollection', features: [] };

export function PostForm({
  friends,
  routes = [],
  pins = [],
  photos: savedPhotos = [],
  initial,
}: {
  friends: Array<{ id: string; label: string }>;
  routes?: AttachChoice[];
  pins?: AttachChoice[];
  photos?: AttachChoice[];
  initial?: {
    id: string;
    postKind: PostKind;
    title: string;
    body: string;
    tripDate: string | null;
    activity: string | null;
  };
}) {
  const [state, action] = useActionState(initial ? savePostEdits : publishPost, null);
  const postKind: PostKind = initial?.postKind ?? 'trip_report';
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [trackJson, setTrackJson] = useState('');
  const [gpxNote, setGpxNote] = useState<string | null>(null);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const tripReport = postKind === 'trip_report';
  const canAttach = tripReport && !initial;

  return (
    <form action={action} className="space-y-4">
      {initial ? <input type="hidden" name="postId" value={initial.id} /> : null}
      <input type="hidden" name="postKind" value={postKind} />
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
      {tripReport ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-bold">Date</span>
            <input
              type="date"
              name="tripDate"
              required
              defaultValue={initial?.tripDate ?? ''}
              className="w-full retro-box-inset bg-white px-3 py-2 text-base"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-bold">What were you doing?</span>
            <select
              name="activity"
              required
              className="w-full retro-box-inset bg-white px-3 py-2 text-base"
              defaultValue={initial?.activity && isActivity(initial.activity) ? initial.activity : 'hike'}
            >
              {ACTIVITIES.map((activity) => (
                <option key={activity} value={activity}>{ACTIVITY_META[activity].label}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      {tripReport && friends.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold">Who came along?</legend>
          <div className="flex flex-wrap gap-3">
            {friends.map((friend) => (
              <label key={friend.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="friend" value={friend.id} />
                {friend.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <label className="block space-y-1">
        <span className="text-sm font-bold">{tripReport ? 'The story' : 'The note'}</span>
        <textarea
          name="body"
          rows={6}
          defaultValue={initial?.body ?? ''}
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        />
      </label>

      {canAttach ? (
        <>
          <AttachList name="route" title="Saved routes" items={routes} empty="No saved routes yet." />
          <AttachList name="pin" title="Saved pins" items={pins} empty="No saved pins yet." />
          <AttachList name="photo" title="Saved photos" items={savedPhotos} empty="No saved photos yet." />
        </>
      ) : null}

      <PhotoFields photos={photos} onChange={setPhotos} showLocation={tripReport} requireLocation={tripReport} />

      {tripReport ? (
        <label className="block space-y-1">
          <span className="text-sm font-bold">GPX route, if you have one</span>
          <input
            type="file"
            accept=".gpx,application/gpx+xml,application/xml,text/xml"
            className="block w-full text-sm"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) {
                setTrackJson('');
                setGpxNote(null);
                return;
              }
              try {
                const packed = packTrack(await file.text());
                if (!packed) {
                  setTrackJson('');
                  setGpxNote('That file has no route in it.');
                  return;
                }
                setTrackJson(JSON.stringify(packed));
                setGpxNote(`${packed.name || file.name}: ${formatMiles(packed.distanceM)}, ${formatFeetGain(packed.elevGainM)}`);
              } catch {
                setTrackJson('');
                setGpxNote('That file could not be read.');
              }
            }}
          />
        </label>
      ) : null}
      <input type="hidden" name="trackJson" value={tripReport ? trackJson : ''} />
      {tripReport && gpxNote ? <p className="text-sm text-gray-700">{gpxNote}</p> : null}

      {canAttach ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold">New pin, optional</legend>
          <label className="block space-y-1">
            <span className="text-sm">Title</span>
            <input name="pinTitle" maxLength={80} className="w-full bg-white px-3 py-2 text-sm retro-box-inset" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Kind</span>
            <select name="pinKind" className="w-full bg-white px-3 py-2 text-sm retro-box-inset" defaultValue="other">
              {PIN_KINDS.map((kind) => (
                <option key={kind} value={kind}>{PIN_KIND_LABELS[kind]}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Note</span>
            <textarea name="pinNote" rows={2} maxLength={500} className="w-full bg-white px-3 py-2 text-sm retro-box-inset" />
          </label>
          <input type="hidden" name="pinLat" value={point?.lat ?? ''} />
          <input type="hidden" name="pinLng" value={point?.lng ?? ''} />
          <div className="h-64 overflow-hidden bg-white retro-box">
            <GroupMap points={EMPTY} lines={EMPTY} picking onPick={(lng, lat) => setPoint({ lng, lat })} />
          </div>
          {point ? <p className="text-sm text-gray-700">Pin at {point.lat.toFixed(4)}, {point.lng.toFixed(4)}.</p> : null}
        </fieldset>
      ) : null}

      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      <SubmitButton tone="green" pendingLabel="Saving…" disabled={tripReport && photos.some((photo) => photo.lat == null)}>
        {initial ? 'Save' : 'Post it'}
      </SubmitButton>
    </form>
  );
}

function AttachList({
  name,
  title,
  items,
  empty,
}: {
  name: string;
  title: string;
  items: AttachChoice[];
  empty: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-bold">{title}</legend>
      {items.length === 0 ? <p className="text-sm text-gray-700">{empty}</p> : (
        <div className="space-y-1">
          {items.map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={name} value={item.id} disabled={item.taken} />
              <span className={item.taken ? 'text-gray-500' : ''}>
                {item.label}
                {item.taken ? ' (already on a trip)' : ''}
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
