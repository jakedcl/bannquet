'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { publishProfilePhotos, publishProfileTrack } from '@/app/trip-reports/actions';
import { PhotoFields } from '@/components/posts/PhotoFields';
import type { UploadedPhoto } from '@/components/posts/prepare-photo';
import { FileInput } from '@/components/ui/FileInput';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { ACTIVITIES, ACTIVITY_META } from '@/lib/activities';
import { formatFeetGain, formatMiles, packTrack } from '@/lib/gpx';
import { cleanRouteTitle, routeTitle } from '@/lib/route-title';
import { SummitPrompts } from '@/components/peaks/SummitPrompts';
import { SaveThenTrip } from '@/components/trips/SaveThenTrip';
import { useReportCreated } from '@/components/trips/use-created';
import type { DraftItem } from '@/lib/trip-draft';

export function RouteUpload({
  inline = false,
  onCreated,
}: {
  inline?: boolean;
  onCreated?: (items: DraftItem[], keepOpen?: boolean) => void;
}) {
  const router = useRouter();
  const refreshed = useRef(false);
  const continued = useRef('');
  const held = useRef('');
  const [state, action, pending] = useActionState(publishProfileTrack, null);
  const suggestions = state?.suggestions ?? [];
  const saveId = state?.created?.[0]?.id ?? '';
  useReportCreated(inline && suggestions.length === 0, state?.created, onCreated);
  const [trackJson, setTrackJson] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    // A saved route leaves the form, so Save can't send it again.
    if (state?.saved || state?.created?.length) {
      setTrackJson('');
      setNote(null);
      setTitle('');
      setTitleTouched(false);
      setFormKey((key) => key + 1);
    }
  }
  useEffect(() => {
    if (!state?.saved || refreshed.current) return;
    refreshed.current = true;
    router.refresh();
  }, [router, state]);

  useEffect(() => {
    if (!inline || suggestions.length === 0 || !state?.created?.length || held.current === saveId) return;
    held.current = saveId;
    onCreated?.(state.created, true);
  }, [inline, onCreated, saveId, state, suggestions.length]);

  function finishSuggestions() {
    if (!saveId || continued.current === saveId) return;
    continued.current = saveId;
    if (state?.continueTo) {
      router.push(state.continueTo);
      return;
    }
    if (inline && state?.created?.length) onCreated?.(state.created);
  }

  return (
    <div className="space-y-3">
    <form key={formKey} action={action} className="space-y-3">
      {inline ? <input type="hidden" name="inline" value="1" /> : null}
      <p className="text-sm font-bold">Add a route</p>
      <label className="block space-y-1">
        <span className="text-sm">Title</span>
        <input
          name="title"
          maxLength={120}
          value={title}
          onChange={(event) => {
            setTitleTouched(true);
            setTitle(event.target.value);
          }}
          className="w-full retro-box-inset bg-white px-3 py-2"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm">Notes</span>
        <textarea
          name="notes"
          rows={4}
          maxLength={4000}
          className="w-full retro-box-inset bg-white px-3 py-2"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm">What were you doing?</span>
        <select name="activity" className="w-full retro-box-inset bg-white px-3 py-2" defaultValue="hike">
          {ACTIVITIES.map((activity) => (
            <option key={activity} value={activity}>{ACTIVITY_META[activity].label}</option>
          ))}
        </select>
      </label>
      <FileInput
        onChange={async (files) => {
          const file = files[0];
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
            if (!titleTouched) {
              const suggested = cleanRouteTitle(packed.name);
              setTitle(suggested && routeTitle(suggested) !== 'Route' ? suggested : '');
            }
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
      {state?.saved || (inline && suggestions.length > 0) ? (
        <p className="text-sm">
          Route saved. It is on the map.
        </p>
      ) : null}
      <SubmitButton pendingLabel="Saving…" disabled={!trackJson}>
        Save route
      </SubmitButton>
      {inline ? null : <SaveThenTrip disabled={pending || !trackJson} />}
    </form>
    {suggestions.length > 0 ? (
      <SummitPrompts key={saveId || 'summits'} peaks={suggestions} onClear={finishSuggestions} />
    ) : null}
    </div>
  );
}

export function PhotoUpload({
  inline = false,
  onCreated,
}: {
  inline?: boolean;
  onCreated?: (items: DraftItem[]) => void;
}) {
  const router = useRouter();
  const refreshed = useRef<unknown>(null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [state, action, pending] = useActionState(publishProfilePhotos, null);
  const [fieldsKey, setFieldsKey] = useState(0);
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    // Saved photos leave the form so a second tap cannot save them twice.
    if (state?.saved || state?.created) {
      setPhotos([]);
      setFieldsKey((key) => key + 1);
    }
  }
  useReportCreated(inline, state?.created, onCreated);
  useEffect(() => {
    if (!state?.saved || refreshed.current === state) return;
    refreshed.current = state;
    router.refresh();
  }, [router, state]);

  return (
    <form action={action} className="space-y-3">
      {inline ? <input type="hidden" name="inline" value="1" /> : null}
      <p className="text-sm font-bold">Add photos</p>
      <PhotoFields key={fieldsKey} photos={photos} onChange={setPhotos} />
      {state?.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
      {state?.saved && photos.length === 0 ? <p className="text-sm">Photos saved.</p> : null}
      <SubmitButton pendingLabel="Saving…" disabled={photos.length === 0 || photos.some((photo) => photo.lat == null)}>
        Save photos
      </SubmitButton>
      {inline ? null : (
        <SaveThenTrip disabled={pending || photos.length === 0 || photos.some((photo) => photo.lat == null)} />
      )}
    </form>
  );
}
