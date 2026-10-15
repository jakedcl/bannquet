'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { publishProfilePhotos, publishProfileTrack } from '@/app/trip-reports/actions';
import { PhotoFields } from '@/components/posts/PhotoFields';
import type { UploadedPhoto } from '@/components/posts/prepare-photo';
import { Button } from '@/components/retro/Button';
import { ACTIVITIES, ACTIVITY_META } from '@/lib/activities';
import { formatFeetGain, formatMiles, packTrack } from '@/lib/gpx';

export function RouteUpload() {
  const router = useRouter();
  const refreshed = useRef(false);
  const [state, action, pending] = useActionState(publishProfileTrack, null);
  const [trackJson, setTrackJson] = useState('');
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (!state?.saved || refreshed.current) return;
    refreshed.current = true;
    router.refresh();
  }, [router, state]);

  return (
    <form action={action} className="space-y-3">
      <p className="text-sm font-bold">Add a route</p>
      <label className="block space-y-1">
        <span className="text-sm">What were you doing?</span>
        <select name="activity" className="w-full retro-box-inset bg-white px-3 py-2" defaultValue="hike">
          {ACTIVITIES.map((activity) => (
            <option key={activity} value={activity}>{ACTIVITY_META[activity].label}</option>
          ))}
        </select>
      </label>
      <input
        type="file"
        accept=".gpx,application/gpx+xml,text/xml"
        className="block w-full text-sm"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) {
            setTrackJson('');
            setNote(null);
            return;
          }
          try {
            const packed = packTrack(await file.text());
            if (!packed) {
              setTrackJson('');
              setNote('That file has no route in it.');
              return;
            }
            setTrackJson(JSON.stringify(packed));
            setNote(`${packed.name || file.name}: ${formatMiles(packed.distanceM)}, ${formatFeetGain(packed.elevGainM)}`);
          } catch {
            setTrackJson('');
            setNote('That file could not be read.');
          }
        }}
      />
      <input type="hidden" name="trackJson" value={trackJson} />
      {note ? (
        <p className={`text-sm ${trackJson ? 'text-gray-700' : 'font-bold text-red-700'}`}>{note}</p>
      ) : null}
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      {state?.saved ? (
        <p className="text-sm">
          Route saved. It is on the map.
        </p>
      ) : null}
      <Button type="submit" disabled={pending || !trackJson}>
        {pending ? 'Saving…' : 'Save route'}
      </Button>
    </form>
  );
}

export function PhotoUpload() {
  const router = useRouter();
  const refreshed = useRef(false);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [state, action, pending] = useActionState(publishProfilePhotos, null);
  useEffect(() => {
    if (!state?.saved || refreshed.current) return;
    refreshed.current = true;
    router.refresh();
  }, [router, state]);

  return (
    <form action={action} className="space-y-3">
      <p className="text-sm font-bold">Add photos</p>
      <PhotoFields photos={photos} onChange={setPhotos} />
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      <Button type="submit" disabled={pending || photos.length === 0 || photos.some((photo) => photo.lat == null)}>
        {pending ? 'Saving…' : 'Save photos'}
      </Button>
    </form>
  );
}
