'use client';

import { useActionState, useState } from 'react';
import { publishPost, savePostEdits } from '@/app/trip-reports/actions';
import { PhotoFields } from '@/components/posts/PhotoFields';
import type { UploadedPhoto } from '@/components/posts/prepare-photo';
import { Button } from '@/components/retro/Button';
import { ACTIVITIES, ACTIVITY_META, isActivity } from '@/lib/activities';
import { parseGpx, formatFeetGain, formatMiles, trackStats } from '@/lib/gpx';
import { POST_KINDS, POST_KIND_LABELS, type PostKind } from '@/lib/post-kinds';

export function PostForm({
  friends,
  initial,
}: {
  friends: Array<{ id: string; label: string }>;
  initial?: {
    id: string;
    postKind: PostKind;
    title: string;
    body: string;
    tripDate: string | null;
    activity: string | null;
  };
}) {
  const [state, action, pending] = useActionState(initial ? savePostEdits : publishPost, null);
  const [postKind, setPostKind] = useState<PostKind>(initial?.postKind ?? 'trip_report');
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [gpxText, setGpxText] = useState('');
  const [gpxNote, setGpxNote] = useState<string | null>(null);
  const tripReport = postKind === 'trip_report';

  return (
    <form action={action} className="space-y-4">
      {initial ? <input type="hidden" name="postId" value={initial.id} /> : null}
      <label className="block space-y-1">
        <span className="text-sm font-bold">Type</span>
        <select
          name="postKind"
          value={postKind}
          onChange={(event) => {
            const next = event.target.value;
            if (next === 'trip_report' || next === 'general') setPostKind(next);
          }}
          className="w-full retro-box-inset bg-white px-3 py-2 text-base"
        >
          {POST_KINDS.map((kind) => (
            <option key={kind} value={kind}>{POST_KIND_LABELS[kind]}</option>
          ))}
        </select>
        <span className="block text-xs text-gray-600">
          {tripReport
            ? 'A trip report can include the day, photos, and a route.'
            : 'A general post is a note and an optional photo.'}
        </span>
      </label>
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
      ) : null}
      <input type="hidden" name="gpxText" value={tripReport ? gpxText : ''} />
      {tripReport && gpxNote ? <p className="text-sm text-gray-700">{gpxNote}</p> : null}
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      <Button tone="green" type="submit" disabled={pending || (tripReport && photos.some((photo) => photo.lat == null))}>
        {pending ? 'Saving…' : initial ? 'Save' : 'Post it'}
      </Button>
    </form>
  );
}
