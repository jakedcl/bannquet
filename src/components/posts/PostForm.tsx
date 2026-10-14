'use client';

import { useActionState, useState } from 'react';
import { publishPost } from '@/app/trip-reports/actions';
import { PhotoFields } from '@/components/posts/PhotoFields';
import type { UploadedPhoto } from '@/components/posts/prepare-photo';
import { Button } from '@/components/retro/Button';
import { ACTIVITIES, ACTIVITY_META } from '@/lib/activities';
import { parseGpx, formatFeetGain, formatMiles, trackStats } from '@/lib/gpx';

export function PostForm({ friends }: { friends: Array<{ id: string; label: string }> }) {
  const [state, action, pending] = useActionState(publishPost, null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [gpxText, setGpxText] = useState('');
  const [gpxNote, setGpxNote] = useState<string | null>(null);

  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-bold">Title</span>
        <input name="title" required maxLength={120} className="w-full retro-box-inset bg-white px-3 py-2 text-base" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-bold">Date</span>
          <input type="date" name="tripDate" required className="w-full retro-box-inset bg-white px-3 py-2 text-base" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-bold">What were you doing?</span>
          <select name="activity" required className="w-full retro-box-inset bg-white px-3 py-2 text-base" defaultValue="hike">
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
        <textarea name="body" rows={6} className="w-full retro-box-inset bg-white px-3 py-2 text-base" />
      </label>
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
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      <Button tone="green" type="submit" disabled={pending || photos.some((photo) => photo.lat == null)}>
        {pending ? 'Saving…' : 'Post it'}
      </Button>
    </form>
  );
}
