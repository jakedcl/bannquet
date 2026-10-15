'use client';

import dynamic from 'next/dynamic';
import { useActionState, useState } from 'react';
import { publishPost } from '@/app/trip-reports/actions';
import { PhotoFields } from '@/components/posts/PhotoFields';
import type { UploadedPhoto } from '@/components/posts/prepare-photo';
import { Button } from '@/components/retro/Button';
import { ACTIVITIES, ACTIVITY_META } from '@/lib/activities';
import { parseGpx, formatFeetGain, formatMiles, trackStats } from '@/lib/gpx';
import { PIN_KINDS, PIN_KIND_LABELS } from '@/lib/pin-kinds';
import type { AttachChoice } from '@/lib/library';
import type { MapFeatureCollection } from '@/lib/posts';

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
}: {
  friends: Array<{ id: string; label: string }>;
  routes?: AttachChoice[];
  pins?: AttachChoice[];
  photos?: AttachChoice[];
}) {
  const [state, action, pending] = useActionState(publishPost, null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [gpxText, setGpxText] = useState('');
  const [gpxNote, setGpxNote] = useState<string | null>(null);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);

  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-bold">Title</span>
        <input name="title" required maxLength={120} className="w-full bg-white px-3 py-2 text-base retro-box-inset" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-bold">Date</span>
          <input type="date" name="tripDate" required className="w-full bg-white px-3 py-2 text-base retro-box-inset" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-bold">What were you doing?</span>
          <select name="activity" required className="w-full bg-white px-3 py-2 text-base retro-box-inset" defaultValue="hike">
            {ACTIVITIES.map((activity) => (
              <option key={activity} value={activity}>{ACTIVITY_META[activity].label}</option>
            ))}
          </select>
        </label>
      </div>
      {friends.length > 0 ? (
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
        <span className="text-sm font-bold">The story</span>
        <textarea name="body" rows={6} className="w-full bg-white px-3 py-2 text-base retro-box-inset" />
      </label>

      <p className="text-sm text-gray-700">
        You can attach a route, pin, or photo you already saved, or add a new one here.
      </p>
      <AttachList name="route" title="Saved routes" items={routes} empty="No saved routes yet." />
      <AttachList name="pin" title="Saved pins" items={pins} empty="No saved pins yet." />
      <AttachList name="photo" title="Saved photos" items={savedPhotos} empty="No saved photos yet." />

      <PhotoFields photos={photos} onChange={setPhotos} />
      <label className="block space-y-1">
        <span className="text-sm font-bold">GPX route, if you have one</span>
        <input
          type="file"
          accept=".gpx,application/gpx+xml,application/xml,text/xml"
          className="block w-full text-sm"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
              setGpxText('');
              setGpxNote(null);
              return;
            }
            const text = await file.text();
            const parsed = parseGpx(text);
            if (parsed.points.length < 2) {
              setGpxText('');
              setGpxNote('That file has no route in it.');
              return;
            }
            const stats = trackStats(parsed.points);
            setGpxText(text);
            setGpxNote(`${parsed.name || file.name}: ${formatMiles(stats.distanceM)}, ${formatFeetGain(stats.elevGainM)}`);
          }}
        />
      </label>
      <input type="hidden" name="gpxText" value={gpxText} />
      {gpxNote ? <p className="text-sm text-gray-700">{gpxNote}</p> : null}

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
        <p className="text-sm text-gray-700">
          {point ? `Pin at ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}.` : 'Click the map if this report needs a new pin.'}
        </p>
      </fieldset>

      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      <Button tone="green" type="submit" disabled={pending || photos.some((photo) => photo.lat == null)}>
        {pending ? 'Saving…' : 'Post it'}
      </Button>
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
                {item.taken ? ' (already on a report)' : ''}
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
